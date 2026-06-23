const mongoose = require('mongoose');

const shipQuoteSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  converted: {
    to: {
      type: String,
      enum: ['invoice'],
    },
    invoice: {
      type: mongoose.Schema.ObjectId,
      ref: 'Invoice',
    },
    invoices: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Invoice',
      },
    ],
    supplierQuote: {
      type: mongoose.Schema.ObjectId,
      ref: 'SupplierQuote',
    },
    /** 由此 Ship Quote 產生的所有 S 單（可多次上單／拆量） */
    supplierQuotes: [{
      type: mongoose.Schema.ObjectId,
      ref: 'SupplierQuote',
    }],
  },
  /** 轉發票鎖定方式：A=按行數量，B=逐項專案佔比（首張發票決定） */
  invoiceConversionMode: {
    type: String,
    enum: ['A', 'B'],
  },
  numberPrefix: {
    type: String,
    enum: ['SML'],
    default: 'SML',
    required: true,
  },
  number: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['吊船'],
    default: '吊船',
    required: true,
  },
  // 吊船相關字段（必填）
  shipType: {
    type: String,
    enum: ['續租', '租賃'],
    required: true,
  },
  subcontractorCount: {
    type: Number,
  },
  costPrice: {
    type: Number,
  },
  content: String,
  date: {
    type: Date,
    required: true,
  },
  expiredDate: {
    type: Date,
    required: false,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  invoiceNumber: {
    type: String,
  },

  poNumber: {
    type: String,
  },
  contactPerson: {
    type: String,
  },
  receiver: {
    type: String,
  },
  receiptDisplayName: {
    type: String,
  },
  address: {
    type: String,
  },

  // 向後兼容：保留舊的client字段
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    autopopulate: true,
  },
  // 新的多客戶字段
  clients: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    autopopulate: true,
  }],
  supplier: {
    type: mongoose.Schema.ObjectId,
    ref: 'Supplier',
    autopopulate: true,
  },
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  items: [
    {
      itemName: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      quantity: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
      },
      price: {
        type: Number,
        required: true,
      },
      poNumber: {
        type: String,
      },
      total: {
        type: Number,
        required: true,
      },
    },
  ],
  subTotal: {
    type: Number,
  },
  discountTotal: {
    type: Number,
  },
  total: {
    type: Number,
  },
  credit: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'NA',
    uppercase: true,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  showDiscountPercentOnPdf: {
    type: Boolean,
    default: true,
  },
  showDiscountAmountOnPdf: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
  /** 吊船租賃 PDF「附加項目」：摘要 + 單位 + 單價（可排序） */
  rentalExtraItems: [
    {
      description: { type: String, default: '' },
      unit: { type: String, trim: true },
      unitPrice: { type: Number },
      sortOrder: { type: Number, default: 0 },
    },
  ],
  /** 吊船租賃 PDF「租賃說明」正文（多行；空則 PDF 用內建條款列表） */
  rentalDescription: {
    type: String,
    default: '',
  },
  /** 租賃 PDF「付款方法」段落（空字串或未存則 PDF 用內建預設句） */
  pdfPaymentMethod: {
    type: String,
    default: '',
  },
  /** 租賃 PDF「報價有效期」段落（空則依 expiredDate + 內建邏輯；有值則整段以自訂為準） */
  pdfQuoteValidity: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on hold'],
    default: 'draft',
  },
  approved: {
    type: Boolean,
    default: false,
  },
  isExpired: {
    type: Boolean,
    default: false,
  },
  pdf: {
    type: String,
  },
  files: [
    {
      id: String,
      name: String,
      path: String,
      description: String,
      isPublic: {
        type: Boolean,
        default: true,
      },
    },
  ],
  updated: {
    type: Date,
    default: Date.now,
  },
  modified_at: { type: Date },
  updatedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
});

shipQuoteSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('ShipQuote', shipQuoteSchema);

