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
    enum: ['SMI', 'WSE', 'SP'],
    default: 'SMI',
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
    enum: ['續租', '租賃'],
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
  supplier: {
    type: mongoose.Schema.ObjectId,
    ref: 'Supplier',
    autopopulate: true,
  },

  // 項目關聯
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  /** 此發票佔整個專案的比例（0–100，單位：百分比） */
  projectPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
  /**
   * PDF「專案佔比 (%) :」左側自訂文字（例如：專案佔比 (%)）
   * 不填則前端/PDF 會用預設字樣
   */
  projectPercentageLabel: {
    type: String,
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
      unit: {
        type: String,
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
    enum: ['unpaid', 'paid'],
  },
  paymentDueDate: { // 付款截止日期
    type: Date,
  },
  paidDate: {
    // 已付款日期（手動填寫）
    type: Date,
  },
  paymentTerms: { // 付款條款
    type: String,
    enum: ['即時付款', '一個月', '兩個月', '三個月'],
    default: '一個月',
  },
  /**
   * 付款資料（可多筆；用於取代單一 paymentStatus/paymentDueDate/paymentTerms/credit/paidDate）
   * 向後相容：舊欄位仍保留，未填 paymentEntries 時會以舊欄位視作 1 筆
   */
  paymentEntries: [
    {
      paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid',
      },
      paymentDueDate: {
        type: Date,
      },
      paymentTerms: {
        type: String,
        enum: ['即時付款', '一個月', '兩個月', '三個月'],
        default: '一個月',
      },
      credit: {
        type: Number,
        default: 0,
      },
      paidDate: {
        type: Date,
      },
    },
  ],
  isOverdue: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  
  // 已付金額（舊：由 Payment 記錄累加；新：可由 paymentEntries 加總）
  credit: {
    type: Number,
    default: 0,
  },
  /** 是否全額付清（手動標記） */
  fullPaid: {
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
    enum: ['sent', 'paid'],
    default: 'sent',
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
  modified_at: { type: Date },
  updatedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
});

invoiceSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Invoice', invoiceSchema);