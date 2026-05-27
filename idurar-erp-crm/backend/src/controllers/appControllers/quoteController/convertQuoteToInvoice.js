const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const InvoiceModel = mongoose.model('Invoice');

const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');
const resolveInvoicePoNumberForConversion = require('@/helpers/resolveInvoicePoNumberForConversion');
const { aggregateInvoicedQtyByQuoteLine } = require('@/helpers/quoteInvoiceFromQuote');
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
 * GET：舊版 itemIndices；POST：body { poNumber, lines }（與上單相同，依 P.O 拆量）
 */
const convertQuoteToInvoice = async (req, res) => {
  try {
    const quote = await QuoteModel.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    if (!quote.items || quote.items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Quote 沒有項目，無法轉換',
      });
    }

    const isPost = req.method === 'POST';
    const items = quote.items || [];
    const headerPo = String(quote.poNumber || '').trim();
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

      const invoicedMap = await aggregateInvoicedQtyByQuoteLine(quote._id, poNumberForInvoice);
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
      poNumberForInvoice = resolveInvoicePoNumberForConversion(quote, selectedRaw);
    }

    const invoiceNumberResult = await increaseBySettingKey({
      settingKey: 'last_invoice_number',
    });
    const invoiceNumber = invoiceNumberResult ? invoiceNumberResult.settingValue : 1;

    const subTotal = sumItemTotals(selectedItems);
    const discount = quote.discount != null ? Number(quote.discount) : 0;
    const discountTotal = calculate.multiply(subTotal, discount / 100);
    const total = calculate.sub(subTotal, discountTotal);

    const invDate = new Date();
    const paymentDueDate = new Date(invDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoiceData = {
      converted: {
        from: 'quote',
        quote: quote._id,
      },
      sourceQuote: quote._id,
      ...(isPost
        ? {
            orderFromPoNumber: poNumberForInvoice,
            orderFromQuoteLines,
          }
        : {}),
      numberPrefix: 'SMI',
      number: invoiceNumber.toString(),
      year: new Date().getFullYear(),
      type: quote.type,
      shipType: quote.shipType,
      subcontractorCount: quote.subcontractorCount,
      costPrice: quote.costPrice,
      date: invDate,
      paymentDueDate,
      paymentTerms: '30日',
      isCompleted: quote.isCompleted,
      invoiceNumber:
        quote.numberPrefix && quote.number
          ? `${quote.numberPrefix}-${quote.number}`
          : quote.invoiceNumber,
      poNumber: poNumberForInvoice,
      contactPerson: quote.contactPerson,
      address: quote.address,
      clients: quote.clients,
      client: quote.client,
      project: quote.project,
      items: selectedItems,
      subTotal: Number(subTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      total: Number(total.toFixed(2)),
      credit: 0,
      currency: quote.currency,
      discount: quote.discount,
      showDiscountPercentOnPdf: quote.showDiscountPercentOnPdf,
      showDiscountAmountOnPdf: quote.showDiscountAmountOnPdf,
      notes: quote.notes,
      status: 'sent',
      paymentStatus: 'unpaid',
      isOverdue: false,
      approved: false,
      createdBy: req.admin._id,
    };

    const invoice = await new InvoiceModel(invoiceData).save();

    await QuoteModel.findByIdAndUpdate(req.params.id, {
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
    console.error('Error converting quote to invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting quote to invoice: ' + error.message,
    });
  }
};

module.exports = convertQuoteToInvoice;
