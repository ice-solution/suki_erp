const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  numberPrefix: {
    type: String,
    enum: ['SML', 'QU'],
    default: 'QU',
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
    enum: ['人工', '服務', '材料', '服務&材料'],
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
  /** 表單多個 P.O（與 items[].poNumber 並存；read / 報表用） */
  poNumbers: [{ type: String }],
  contactPerson: {
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
      // taxRate: {
      //   type: Number,
      //   default: 0,
      // },
      // subTotal: {
      //   type: Number,
      //   default: 0,
      // },
      // taxTotal: {
      //   type: Number,
      //   default: 0,
      // },
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
  converted: {
    to: {
      type: String,
      enum: ['invoice'],
    },
    invoice: {
      type: mongoose.Schema.ObjectId,
      ref: 'Invoice',
    },
    // 可重複轉換時，記錄所有由此 Quote 轉出的 Invoice
    invoices: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Invoice',
    }],
    /** 最近一次由此 Quote 產生的 S 單（向後相容） */
    supplierQuote: {
      type: mongoose.Schema.ObjectId,
      ref: 'SupplierQuote',
    },
    /** 由此 Quote 產生的所有 S 單（可多次上單／拆量） */
    supplierQuotes: [{
      type: mongoose.Schema.ObjectId,
      ref: 'SupplierQuote',
    }],
  },
  /** 轉發票鎖定方式：A=按行數量，B=專案佔比（首張發票決定） */
  invoiceConversionMode: {
    type: String,
    enum: ['A', 'B'],
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

quoteSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Quote', quoteSchema);
