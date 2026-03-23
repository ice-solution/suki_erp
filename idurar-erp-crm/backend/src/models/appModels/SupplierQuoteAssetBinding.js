const mongoose = require('mongoose');

const supplierQuoteAssetBindingSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },

  assetType: {
    type: String,
    enum: ['ship', 'winch'],
    required: true,
  },

  ship: {
    type: mongoose.Schema.ObjectId,
    ref: 'Ship',
    default: null,
  },

  winch: {
    type: mongoose.Schema.ObjectId,
    ref: 'Winch',
    default: null,
  },

  supplierQuote: {
    type: mongoose.Schema.ObjectId,
    ref: 'SupplierQuote',
    required: true,
  },

  // S單編號（例如：S-123 / NO-45，跟 Ship/Winch.supplierNumber 一致）
  supplierQuoteNumber: {
    type: String,
    required: true,
    index: true,
  },

  // S單的 Quote Number（SupplierQuote.invoiceNumber）
  quoteNumber: {
    type: String,
    default: '',
  },

  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: { type: Date, default: Date.now },
});

supplierQuoteAssetBindingSchema.index({ assetType: 1, ship: 1, winch: 1 });

module.exports = mongoose.model('SupplierQuoteAssetBinding', supplierQuoteAssetBindingSchema);

