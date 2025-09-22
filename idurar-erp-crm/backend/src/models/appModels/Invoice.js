const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  // Quote結構的字段 - 保持完全一致
  numberPrefix: {
    type: String,
    enum: ['SML', 'QU', 'XX', 'INV'], // 為Invoice添加INV前綴
    default: 'INV',
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
    enum: ['人工', '服務', '材料', '服務&材料', '吊船'],
    required: true,
  },
  shipType: { // 當type為'吊船'時使用
    type: String,
    enum: ['續租', '租貨'],
  },
  subcontractorCount: {
    type: Number,
  },
  costPrice: {
    type: Number,
  },
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
  poNumber: {
    type: String,
  },
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
    required: true,
  }],

  // 項目關聯
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },

  // Quote轉換信息
  converted: {
    from: {
      type: String,
      enum: ['quote', 'offer'],
    },
    quote: {
      type: mongoose.Schema.ObjectId,
      ref: 'Quote',
    },
  },

  // 項目items - 與Quote完全一致
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
      price: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
    },
  ],

  // 財務字段 - 與Quote一致（使用discount而不是tax）
  subTotal: {
    type: Number,
  },
  discountTotal: {
    type: Number,
  },
  total: {
    type: Number,
  },
  discount: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'HKD',
    uppercase: true,
    required: true,
  },

  // Invoice特有字段
  paymentStatus: {
    type: String,
    default: 'unpaid',
    enum: ['unpaid', 'paid', 'partially'],
  },
  paymentDueDate: { // 付款截止日期
    type: Date,
  },
  invoiceDate: { // 開票日期
    type: Date,
    default: Date.now,
  },
  paymentTerms: { // 付款條款
    type: String,
    enum: ['即時付款', '7天', '14天', '30天', '60天', '90天'],
    default: '30天',
  },
  isOverdue: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  
  // 付款記錄
  payment: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Payment',
  }],

  // 會計科目代碼
  revenueAccount: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChartOfAccounts',
  },
  receivableAccount: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChartOfAccounts',
  },

  // 其他字段
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
  },
  pdf: {
    type: String,
  },
  files: [{
    id: String,
    name: String,
    path: String,
    description: String,
    isPublic: {
      type: Boolean,
      default: true,
    },
  }],

  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

invoiceSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Invoice', invoiceSchema);