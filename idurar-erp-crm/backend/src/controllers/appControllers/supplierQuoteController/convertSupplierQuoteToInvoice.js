const mongoose = require('mongoose');

const SupplierQuoteModel = mongoose.model('SupplierQuote');
const InvoiceModel = mongoose.model('Invoice');

const { increaseBySettingKey } = require('@/middlewares/settings');

const INVOICE_PREFIXES = new Set(['SMI', 'WSE', 'SP']);

const convert = async (req, res) => {
  try {
    // Find the supplier quote by id
    const supplierQuote = await SupplierQuoteModel.findById(req.params.id);
    
    if (!supplierQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Supplier Quote not found',
      });
    }

    const invoiceNumberPrefix = INVOICE_PREFIXES.has(supplierQuote.numberPrefix)
      ? supplierQuote.numberPrefix
      : 'SMI';

    // Create invoice data from supplier quote
    const invoiceData = {
      converted: {
        from: 'supplierQuote',
        supplierQuote: supplierQuote._id,
      },
      numberPrefix: invoiceNumberPrefix,
      number: supplierQuote.number,
      year: supplierQuote.year,
      type: supplierQuote.type,
      shipType: supplierQuote.shipType,
      subcontractorCount: supplierQuote.subcontractorCount,
      costPrice: supplierQuote.costPrice,
      date: supplierQuote.date,
      isCompleted: supplierQuote.isCompleted,
      invoiceNumber: supplierQuote.numberPrefix && supplierQuote.number ? `${supplierQuote.numberPrefix}-${supplierQuote.number}` : supplierQuote.invoiceNumber,
      contactPerson: supplierQuote.contactPerson,
      address: supplierQuote.address,
      clients: supplierQuote.clients,
      project: supplierQuote.project,
      items: supplierQuote.items,
      subTotal: supplierQuote.subTotal,
      discountTotal: supplierQuote.discountTotal,
      total: supplierQuote.total,
      credit: supplierQuote.credit,
      currency: supplierQuote.currency,
      discount: supplierQuote.discount,
      notes: supplierQuote.notes,
      status: 'sent',
      paymentStatus: 'unpaid',
      createdBy: req.admin._id,
    };

    // Create new invoice
    const invoice = await new InvoiceModel(invoiceData).save();
    
    // Update supplier quote as converted
    await SupplierQuoteModel.findByIdAndUpdate(req.params.id, {
      converted: true,
    });

    // Increase invoice number
    increaseBySettingKey({
      settingKey: 'last_invoice_number',
    });

    return res.status(200).json({
      success: true,
      result: invoice,
      message: 'Supplier Quote converted to Invoice successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting supplier quote to invoice',
    });
  }
};

module.exports = convert;
