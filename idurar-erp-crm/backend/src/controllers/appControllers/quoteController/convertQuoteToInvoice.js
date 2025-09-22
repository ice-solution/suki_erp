const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const InvoiceModel = mongoose.model('Invoice');

const { increaseBySettingKey } = require('@/middlewares/settings');

const convertQuoteToInvoice = async (req, res) => {
  try {
    // Find the quote by id
    const quote = await QuoteModel.findById(req.params.id);
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    // Check if quote is already converted
    if (quote.converted && quote.converted.to === 'invoice') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Quote has already been converted to invoice',
      });
    }

    // Get next invoice number
    const invoiceNumberResult = await increaseBySettingKey({
      settingKey: 'last_invoice_number',
    });
    
    const invoiceNumber = invoiceNumberResult ? invoiceNumberResult.settingValue : 1;

    // Create invoice data from quote
    const invoiceData = {
      converted: {
        from: 'quote',
        quote: quote._id,
      },
      numberPrefix: 'INV', // Invoice使用INV前綴
      number: invoiceNumber.toString(),
      year: new Date().getFullYear(),
      type: quote.type,
      shipType: quote.shipType,
      subcontractorCount: quote.subcontractorCount,
      costPrice: quote.costPrice,
      date: new Date(), // Invoice date是今天
      expiredDate: quote.expiredDate,
      invoiceDate: new Date(), // Invoice specific field
      paymentDueDate: null, // 可以後續設定
      paymentTerms: '30天', // 默認付款條件
      isCompleted: quote.isCompleted,
      poNumber: quote.poNumber,
      contactPerson: quote.contactPerson,
      address: quote.address,
      clients: quote.clients,
      client: quote.client, // 向後兼容
      project: quote.project,
      items: quote.items,
      subTotal: quote.subTotal,
      discountTotal: quote.discountTotal,
      total: quote.total,
      credit: 0, // Invoice初始credit為0
      currency: quote.currency,
      discount: quote.discount,
      notes: quote.notes,
      status: 'draft', // Invoice初始狀態為draft
      paymentStatus: 'unpaid', // 初始付款狀態
      isOverdue: false,
      approved: false,
      createdBy: req.admin._id,
    };

    // Create new invoice
    const invoice = await new InvoiceModel(invoiceData).save();
    
    // Update quote as converted
    await QuoteModel.findByIdAndUpdate(req.params.id, {
      converted: {
        to: 'invoice',
        invoice: invoice._id,
      },
    });

    return res.status(200).json({
      success: true,
      result: invoice,
      message: 'Quote converted to Invoice successfully',
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