const mongoose = require('mongoose');

const ShipQuoteModel = mongoose.model('ShipQuote');
const InvoiceModel = mongoose.model('Invoice');
const ProjectModel = mongoose.model('Project');

const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');
const resolveInvoicePoNumberForConversion = require('@/helpers/resolveInvoicePoNumberForConversion');
const { aggregateInvoicedQtyByShipQuoteLine } = require('@/helpers/quoteInvoiceFromQuote');
const { resolvePoConversionLines } = require('@/helpers/resolvePoConversionLines');

function buildInvoiceItemsFromResolvedLines(items, resolvedLines) {
  return resolvedLines.map(({ itemIndex, quantity }) => {
    const item = items[itemIndex];
    const price = Number(item.price) || 0;
    const lineTotal = calculate.multiply(quantity, price);
    return {
      itemName: item.itemName,
      description: item.description,
      quantity,
      unit: item.unit,
      price,
      total: Number(Number(lineTotal).toFixed(2)),
    };
  });
}

function sumItemTotals(invoiceItems) {
  let subTotal = 0;
  invoiceItems.forEach((item) => {
    if (item && item.total != null) {
      subTotal = calculate.add(subTotal, Number(item.total));
    }
  });
  return subTotal;
}

/**
 * GET：舊版 itemIndices；POST：body { poNumber, lines }
 */
const convertShipQuoteToInvoice = async (req, res) => {
  try {
    const shipQuote = await ShipQuoteModel.findById(req.params.id);
    const quoteNumberLink =
      shipQuote.numberPrefix && shipQuote.number
        ? `${shipQuote.numberPrefix}-${shipQuote.number}`
        : shipQuote.invoiceNumber;
    const linkedProject = quoteNumberLink
      ? await ProjectModel.findOne({ invoiceNumber: quoteNumberLink, removed: false })
      : null;

    if (!shipQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'ShipQuote not found',
      });
    }

    if (!shipQuote.items || shipQuote.items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'ShipQuote 沒有項目，無法轉換',
      });
    }

    const isPost = req.method === 'POST';
    const items = shipQuote.items || [];
    const headerPo = String(shipQuote.poNumber || '').trim();
    let selectedItems;
    let poNumberForInvoice;
    let orderFromQuoteLines;

    if (isPost) {
      poNumberForInvoice = String(req.body?.poNumber || '').trim();
      if (!poNumberForInvoice) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'P.O number is required',
        });
      }

      const invoicedMap = await aggregateInvoicedQtyByShipQuoteLine(shipQuote._id, poNumberForInvoice);
      const resolved = resolvePoConversionLines({
        items,
        headerPo,
        poNumber: poNumberForInvoice,
        qtyByLineMap: invoicedMap,
        rawLines: req.body?.lines,
        isPost: true,
      });
      if (!resolved.ok) {
        return res.status(resolved.status).json({
          success: false,
          result: null,
          message: resolved.message,
        });
      }
      orderFromQuoteLines = resolved.lines.map((l) => ({
        itemIndex: l.itemIndex,
        quantity: l.quantity,
      }));
      selectedItems = buildInvoiceItemsFromResolvedLines(items, resolved.lines);
    } else {
      let selectedRaw = items;
      const itemIndicesParam = req.query.itemIndices;
      if (itemIndicesParam && typeof itemIndicesParam === 'string' && itemIndicesParam.trim() !== '') {
        const indices = itemIndicesParam
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n) && n >= 0 && n < items.length);
        if (indices.length === 0) {
          return res.status(400).json({
            success: false,
            result: null,
            message: '請至少選擇一項項目轉換',
          });
        }
        selectedRaw = indices.map((i) => items[i]);
      }
      selectedItems = selectedRaw.map((item) => ({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        total: item.total,
      }));
      poNumberForInvoice = resolveInvoicePoNumberForConversion(shipQuote, selectedRaw);
    }

    const invoiceNumberResult = await increaseBySettingKey({
      settingKey: 'last_invoice_number',
    });
    const invoiceNumber = invoiceNumberResult ? invoiceNumberResult.settingValue : 1;

    const subTotal = sumItemTotals(selectedItems);
    const discount = shipQuote.discount != null ? Number(shipQuote.discount) : 0;
    const discountTotal = calculate.multiply(subTotal, discount / 100);
    const total = calculate.sub(subTotal, discountTotal);

    const invDate = new Date();
    const paymentDueDate = new Date(invDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoiceData = {
      converted: {
        from: 'shipQuote',
        shipQuote: shipQuote._id,
      },
      sourceShipQuote: shipQuote._id,
      ...(isPost
        ? {
            orderFromPoNumber: poNumberForInvoice,
            orderFromQuoteLines,
          }
        : {}),
      numberPrefix: 'SMI',
      number: invoiceNumber.toString(),
      year: new Date().getFullYear(),
      type: shipQuote.type,
      shipType: shipQuote.shipType,
      subcontractorCount: shipQuote.subcontractorCount,
      costPrice: shipQuote.costPrice,
      date: invDate,
      paymentDueDate,
      paymentTerms: '30日',
      isCompleted: shipQuote.isCompleted,
      invoiceNumber:
        shipQuote.numberPrefix && shipQuote.number
          ? `${shipQuote.numberPrefix}-${shipQuote.number}`
          : shipQuote.invoiceNumber,
      poNumber: poNumberForInvoice,
      // 上單／轉發票：不帶備註與簽收單聯絡人（僅保留在原 ShipQuote 作內部記錄）
      address: shipQuote.address,
      clients: shipQuote.clients,
      client: shipQuote.client,
      project: linkedProject?._id || shipQuote.project,
      items: selectedItems,
      subTotal: Number(subTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      total: Number(total.toFixed(2)),
      credit: 0,
      currency: shipQuote.currency,
      discount: shipQuote.discount,
      showDiscountPercentOnPdf: shipQuote.showDiscountPercentOnPdf,
      showDiscountAmountOnPdf: shipQuote.showDiscountAmountOnPdf,
      status: 'sent',
      paymentStatus: 'unpaid',
      isOverdue: false,
      approved: false,
      createdBy: req.admin._id,
    };

    const invoice = await new InvoiceModel(invoiceData).save();

    // 同步到 Project Management：讓 project 詳情可即時見到新 Invoice
    if (linkedProject && linkedProject._id) {
      await ProjectModel.updateOne(
        { _id: linkedProject._id, removed: false },
        {
          $addToSet: { invoices: invoice._id },
          $set: { updated: new Date(), modified_at: new Date() },
        }
      );
    }

    await ShipQuoteModel.findByIdAndUpdate(req.params.id, {
      $set: {
        'converted.to': 'invoice',
        'converted.invoice': invoice._id,
      },
      $push: {
        'converted.invoices': invoice._id,
      },
    });

    return res.status(200).json({
      success: true,
      result: invoice,
      message: 'Quote 已成功轉換成 Invoice',
    });
  } catch (error) {
    console.error('Error converting ship quote to invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting ship quote to invoice: ' + error.message,
    });
  }
};

module.exports = convertShipQuoteToInvoice;
