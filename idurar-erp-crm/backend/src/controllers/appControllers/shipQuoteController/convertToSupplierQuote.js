const mongoose = require('mongoose');

const ShipQuoteModel = mongoose.model('ShipQuote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');
const ProjectModel = mongoose.model('Project');

const { increaseSupplierQuoteLastNumberByPrefix } = require('@/middlewares/settings');
const { aggregateOrderedQtyByShipQuoteLine } = require('@/helpers/quoteSupplierOrderFromQuote');
const { resolveDefaultSupplierId } = require('@/helpers/resolveDefaultSupplierId');

function normalizeQty(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? v : 0;
}

function linePoNumber(item, headerPo) {
  return String(item.poNumber || '').trim() || headerPo;
}

/**
 * 將 Ship Quote 轉為 S 單。GET：依餘額一次上滿；POST：body { poNumber, lines: [{ itemIndex, quantity }] }
 */
const convertToSupplierQuote = async (req, res) => {
  try {
    const shipQuote = await ShipQuoteModel.findById(req.params.id);

    if (!shipQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Ship Quote not found',
      });
    }

    if (!shipQuote.items || shipQuote.items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Ship Quote 沒有項目，無法轉換',
      });
    }

    const quoteNumber =
      shipQuote.numberPrefix && shipQuote.number
        ? `${shipQuote.numberPrefix}-${shipQuote.number}`
        : shipQuote.invoiceNumber;
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

    const items = shipQuote.items || [];
    const headerPo = String(shipQuote.poNumber || '').trim();
    const orderedMap = await aggregateOrderedQtyByShipQuoteLine(shipQuote._id, poNumber);

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
        description: item.description || '',
        quantity,
        unit: item.unit,
      };
    });

    const supplierQuoteNumberResult = await increaseSupplierQuoteLastNumberByPrefix('S');
    const supplierQuoteNumber = supplierQuoteNumberResult ? supplierQuoteNumberResult.settingValue : 1;

    const supplierQuoteData = {
      converted: false,
      numberPrefix: 'S',
      number: supplierQuoteNumber.toString(),
      year: new Date().getFullYear(),
      type: shipQuote.type || '吊船',
      shipType: shipQuote.shipType,
      subcontractorCount: shipQuote.subcontractorCount,
      costPrice: shipQuote.costPrice,
      date: new Date(),
      openDate: new Date(),
      expiredDate: shipQuote.expiredDate,
      isCompleted: shipQuote.isCompleted,
      invoiceNumber:
        shipQuote.numberPrefix && shipQuote.number
          ? `${shipQuote.numberPrefix}-${shipQuote.number}`
          : shipQuote.invoiceNumber,
      poNumber,
      // 上單／轉發票：不帶備註與簽收單聯絡人（僅保留在原 ShipQuote 作內部記錄）
      address: shipQuote.address,
      clients: shipQuote.clients,
      client: shipQuote.client,
      project: linkedProject?._id || shipQuote.project,
      sourceShipQuote: shipQuote._id,
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
      currency: shipQuote.currency || 'NA',
      discount: shipQuote.discount ?? 0,
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

    await ShipQuoteModel.findByIdAndUpdate(req.params.id, {
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
      message: 'Ship Quote 已成功轉換成 S單',
    });
  } catch (error) {
    console.error('Error converting ship quote to supplier quote:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '轉換失敗：' + error.message,
    });
  }
};

module.exports = convertToSupplierQuote;
