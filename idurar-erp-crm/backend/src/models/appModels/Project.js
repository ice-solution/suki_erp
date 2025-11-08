const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  // 項目名稱
  name: {
    type: String,
    required: true,
  },

  // Invoice Number (Type + Number) - 用於關聯其他文件
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },

  // 備存 P.O Number
  poNumber: {
    type: String,
    default: '',
  },

  // 項目狀態
  status: {
    type: String,
    enum: ['draft', 'pending', 'in_progress', 'completed', 'cancelled', 'on hold'],
    default: 'draft',
  },

  // 成本承擔方
  costBy: {
    type: String,
    enum: ['對方', '我方'],
    required: true,
  },

  // 項目價格
  projectPrice: {
    type: Number,
    default: 0,
  },

  // 關聯的供應商
  suppliers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    autopopulate: true,
  }],

  // 關聯的承包商
  contractors: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Contractor',
    autopopulate: true,
  }],

  // 關聯的quotations
  quotations: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Quote',
    autopopulate: true,
  }],

  // 關聯的supplier quotations
  supplierQuotations: [{
    type: mongoose.Schema.ObjectId,
    ref: 'SupplierQuote',
    autopopulate: true,
  }],

  // 關聯的invoices
  invoices: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Invoice',
    autopopulate: true,
  }],

  // 人工管理
  salaries: [{
    contractorEmployee: {
      type: mongoose.Schema.ObjectId,
      ref: 'ContractorEmployee',
      required: true,
    },
    dailySalary: {
      type: Number,
      required: true,
      min: 0,
    },
    workDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    updated: {
      type: Date,
      default: Date.now,
    },
  }],

  // 打咭記錄
  onboard: [{
    contractorEmployee: {
      type: mongoose.Schema.ObjectId,
      ref: 'ContractorEmployee',
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkInTime: {
      type: String, // 格式: "HH:mm"
      required: true,
    },
    checkOutTime: {
      type: String, // 格式: "HH:mm"，可選
    },
    workHours: {
      type: Number, // 工作時數，自動計算
      default: 0,
    },
    notes: {
      type: String,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    updated: {
      type: Date,
      default: Date.now,
    },
  }],

  // 毛利
  grossProfit: {
    type: Number,
    default: 0,
  },

  // S_price (supplier quotations總額)
  sPrice: {
    type: Number,
    default: 0,
  },

  // 判頭費
  contractorFee: {
    type: Number,
    default: 0,
  },

  // 成本價 (quotations總額)
  costPrice: {
    type: Number,
    default: 0,
  },

  // 項目描述
  description: {
    type: String,
  },

  // 項目地址
  address: {
    type: String,
  },

  // 開始日期
  startDate: {
    type: Date,
  },

  // 結束日期
  endDate: {
    type: Date,
  },

  // 創建和更新時間
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

projectSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Project', projectSchema);
