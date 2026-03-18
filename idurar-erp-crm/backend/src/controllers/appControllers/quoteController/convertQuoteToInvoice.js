const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const InvoiceModel = mongoose.model('Invoice');

const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

/**
 * 將 Quote 轉換為 Invoice（可重複轉換，可選擇部分 items）
 * Query: itemIndices 可選，逗號分隔的項目索引，例如 "0,1,3"。不傳則轉換全部項目。
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

    // 解析要轉換的項目索引（0-based）
    let selectedItems = quote.items;
    const itemIndicesParam = req.query.itemIndices;
    if (itemIndicesParam && typeof itemIndicesParam === 'string' && itemIndicesParam.trim() !== '') {
      const indices = itemIndicesParam
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n < quote.items.length);
      if (indices.length === 0) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '請至少選擇一項項目轉換',
        });
      }
      selectedItems = indices.map((i) => quote.items[i]);
    }

    const invoiceNumberResult = await increaseBySettingKey({
      settingKey: 'last_invoice_number',
    });
    const invoiceNumber = invoiceNumberResult ? invoiceNumberResult.settingValue : 1;

    // 依選中項目計算 subTotal、discountTotal、total
    let subTotal = 0;
    selectedItems.forEach((item) => {
      if (item && item.total != null) {
        subTotal = calculate.add(subTotal, Number(item.total));
      }
    });
    const discount = quote.discount != null ? Number(quote.discount) : 0;
    const discountTotal = calculate.multiply(subTotal, discount / 100);
    const total = calculate.sub(subTotal, discountTotal);

    const invoiceData = {
      converted: {
        from: 'quote',
        quote: quote._id,
      },
      numberPrefix: 'INV',
      number: invoiceNumber.toString(),
      year: new Date().getFullYear(),
      type: quote.type,
      shipType: quote.shipType,
      subcontractorCount: quote.subcontractorCount,
      costPrice: quote.costPrice,
      date: new Date(),
      paymentDueDate: null,
      paymentTerms: '一個月',
      isCompleted: quote.isCompleted,
      invoiceNumber:
        quote.numberPrefix && quote.number
          ? `${quote.numberPrefix}-${invoiceNumber}`
          : quote.invoiceNumber,
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
      notes: quote.notes,
      status: 'draft',
      paymentStatus: 'unpaid',
      isOverdue: false,
      approved: false,
      createdBy: req.admin._id,
    };

    const invoice = await new InvoiceModel(invoiceData).save();

    // 更新 Quote：記錄此 Invoice（可重複轉換，用 $push）
    await QuoteModel.findByIdAndUpdate(req.params.id, {
      $set: {
        'converted.to': 'invoice',
        'converted.invoice': invoice._id, // 最後一筆，向後兼容
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
