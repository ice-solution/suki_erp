const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');
const ProjectModel = mongoose.model('Project');

const { aggregateOrderedQtyByQuoteLine } = require('@/helpers/quoteSupplierOrderFromQuote');
const { resolveDefaultSupplierId } = require('@/helpers/resolveDefaultSupplierId');
const { resolveSupplierQuoteNumberForCreate } = require('@/helpers/lastNumberSettings');

function normalizeQty(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? v : 0;
}

function linePoNumber(item, headerPo) {
  return String(item.poNumber || '').trim() || headerPo;
}

/**
 * GET：依餘額一次上滿（舊客戶端相容）；POST：body { poNumber, lines: [{ itemIndex, quantity }] }
 */
const convertQuoteToSupplierQuote = async (req, res) => {
  try {
    const quote = await QuoteModel.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    const quoteNumber =
      quote.numberPrefix && quote.number
        ? `${quote.numberPrefix}-${quote.number}`
        : quote.invoiceNumber;
    let linkedProject = null;
    if (quoteNumber) {
      linkedProject = await ProjectModel.findOne({ invoiceNumber: quoteNumber, removed: false });
      if (!linkedProject) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '請先在 Project Management 建立此 Quote Number 的項目，方可上單',
        });
      }
    }

    const isPost = req.method === 'POST';
    const poNumber = String((isPost ? req.body?.poNumber : req.query?.poNumber) || '').trim();
    if (!poNumber) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'P.O number is required',
      });
    }

    const items = quote.items || [];
    const headerPo = String(quote.poNumber || '').trim();
    const orderedMap = await aggregateOrderedQtyByQuoteLine(quote._id, poNumber);

    /** @type {{ itemIndex: number, quantity: number }[]} */
    let resolvedLines = [];

    if (isPost) {
      const rawLines = Array.isArray(req.body?.lines) ? req.body.lines : null;
      if (!rawLines || rawLines.length === 0) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '請提供 lines：[{ itemIndex, quantity }]',
        });
      }
      for (const row of rawLines) {
        const itemIndex = normalizeQty(row?.itemIndex);
        const qty = normalizeQty(row?.quantity);
        if (qty <= 0) continue;
        const item = items[itemIndex];
        if (!item || linePoNumber(item, headerPo) !== poNumber) {
          return res.status(400).json({
            success: false,
            result: null,
            message: `無效的 itemIndex：${itemIndex}`,
          });
        }
        const totalQty = Math.max(0, normalizeQty(item.quantity));
        const already = Math.max(0, normalizeQty(orderedMap[itemIndex] || 0));
        const remaining = Math.max(0, totalQty - already);
        if (qty > remaining) {
          return res.status(400).json({
            success: false,
            result: null,
            message: `第 ${itemIndex + 1} 行上單數量 ${qty} 超過餘額 ${remaining}`,
          });
        }
        resolvedLines.push({ itemIndex, quantity: qty });
      }
    } else {
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex];
        if (linePoNumber(item, headerPo) !== poNumber) continue;
        const totalQty = Math.max(0, normalizeQty(item.quantity));
        const already = Math.max(0, normalizeQty(orderedMap[itemIndex] || 0));
        const remaining = Math.max(0, totalQty - already);
        if (remaining > 0) {
          resolvedLines.push({ itemIndex, quantity: remaining });
        }
      }
    }

    if (resolvedLines.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: isPost
          ? '請至少選擇一行且數量大於 0，且不可超過餘額'
          : `此 P.O 已無可上單餘額或沒有符合的項目：${poNumber}`,
      });
    }

    const supplierQuoteItems = resolvedLines.map(({ itemIndex, quantity }) => {
      const item = items[itemIndex];
      return {
        itemName: item.itemName,
        description: item.description,
        quantity,
        unit: item.unit,
      };
    });

    let supplierQuotePrefix = 'S';
    if (isPost && req.body?.numberPrefix) {
      supplierQuotePrefix = String(req.body.numberPrefix).trim().toUpperCase() || 'S';
    }

    let supplierQuoteNumber;
    try {
      const resolved = await resolveSupplierQuoteNumberForCreate({
        numberPrefix: isPost ? req.body?.numberPrefix : undefined,
        number: isPost ? req.body?.number : undefined,
      });
      supplierQuotePrefix = resolved.numberPrefix;
      supplierQuoteNumber = resolved.number;
    } catch (numErr) {
      return res.status(numErr.statusCode || 400).json({
        success: false,
        result: null,
        message: numErr.message || 'S 單編號無效',
      });
    }

    const supplierQuoteData = {
      converted: false,
      numberPrefix: supplierQuotePrefix,
      number: supplierQuoteNumber,
      year: new Date().getFullYear(),
      type: quote.type,
      shipType: quote.shipType,
      subcontractorCount: quote.subcontractorCount,
      costPrice: quote.costPrice,
      date: new Date(),
      openDate: new Date(),
      expiredDate: quote.expiredDate,
      isCompleted: quote.isCompleted,
      invoiceNumber:
        quote.numberPrefix && quote.number ? `${quote.numberPrefix}-${quote.number}` : quote.invoiceNumber,
      poNumber,
      // 上單／轉發票：不帶備註與簽收單聯絡人（僅保留在原 Quote 作內部記錄）
      address: quote.address,
      clients: quote.clients,
      client: quote.client,
      project: linkedProject?._id || quote.project,
      sourceQuote: quote._id,
      orderFromPoNumber: poNumber,
      orderFromQuoteLines: resolvedLines.map((l) => ({
        itemIndex: l.itemIndex,
        quantity: l.quantity,
      })),
      items: supplierQuoteItems,
      subTotal: 0,
      discountTotal: 0,
      total: 0,
      credit: 0,
      currency: quote.currency,
      discount: 0,
      status: 'accepted',
      createdBy: req.admin._id,
    };

    const defaultSupplierId = await resolveDefaultSupplierId();
    if (defaultSupplierId) {
      supplierQuoteData.supplier = defaultSupplierId;
    }

    const supplierQuote = await new SupplierQuoteModel(supplierQuoteData).save();

    // 同步到 Project Management：讓 project 詳情可即時見到新 S 單
    if (linkedProject && linkedProject._id) {
      await ProjectModel.updateOne(
        { _id: linkedProject._id, removed: false },
        {
          $addToSet: { supplierQuotations: supplierQuote._id },
          $set: { updated: new Date(), modified_at: new Date() },
        }
      );
    }

    await QuoteModel.findByIdAndUpdate(req.params.id, {
      $set: {
        'converted.supplierQuote': supplierQuote._id,
      },
      $push: {
        'converted.supplierQuotes': supplierQuote._id,
      },
    });

    return res.status(200).json({
      success: true,
      result: supplierQuote,
      message: 'Quote converted to Supplier Quote successfully',
    });
  } catch (error) {
    console.error('Error converting quote to supplier quote:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting quote to supplier quote: ' + error.message,
    });
  }
};

module.exports = convertQuoteToSupplierQuote;
