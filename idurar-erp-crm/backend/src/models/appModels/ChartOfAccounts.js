const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  // 科目代碼
  accountCode: {
    type: String,
    required: true,
    unique: true,
  },

  // 科目名稱
  accountName: {
    type: String,
    required: true,
  },

  // 科目類型
  accountType: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true,
  },

  // 科目子類型
  accountSubType: {
    type: String,
    enum: [
      // 資產類
      'current_asset', 'fixed_asset', 'intangible_asset', 'investment',
      // 負債類
      'current_liability', 'long_term_liability',
      // 權益類
      'owner_equity', 'retained_earnings',
      // 收入類
      'operating_revenue', 'other_revenue',
      // 費用類
      'cost_of_goods_sold', 'operating_expense', 'financial_expense', 'other_expense'
    ],
    required: true,
  },

  // 正常餘額方向
  normalBalance: {
    type: String,
    enum: ['debit', 'credit'],
    required: true,
  },

  // 父科目（用於建立科目階層）
  parentAccount: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChartOfAccounts',
  },

  // 科目層級
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
  },

  // 是否為明細科目（不能再有下級科目）
  isDetailAccount: {
    type: Boolean,
    default: true,
  },

  // 是否允許手動記帳
  allowManualEntry: {
    type: Boolean,
    default: true,
  },

  // 是否為系統自動科目
  isSystemAccount: {
    type: Boolean,
    default: false,
  },

  // 科目描述
  description: {
    type: String,
  },

  // 是否在資產負債表顯示
  showInBalanceSheet: {
    type: Boolean,
    default: true,
  },

  // 是否在損益表顯示
  showInIncomeStatement: {
    type: Boolean,
    default: true,
  },

  // 科目狀態
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  },

  // 期初餘額
  openingBalance: {
    type: Number,
    default: 0,
  },

  // 當前餘額
  currentBalance: {
    type: Number,
    default: 0,
  },

  // 建立者
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: true,
  },

  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

// 更新時間中間件
schema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

// 索引
schema.index({ accountCode: 1 });
schema.index({ accountType: 1, accountSubType: 1 });
schema.index({ parentAccount: 1 });

// 虛擬欄位：子科目
schema.virtual('children', {
  ref: 'ChartOfAccounts',
  localField: '_id',
  foreignField: 'parentAccount'
});

// 方法：獲取完整科目路徑
schema.methods.getFullPath = async function() {
  let path = this.accountName;
  let parent = this.parentAccount;
  
  while (parent) {
    const parentAccount = await this.constructor.findById(parent);
    if (parentAccount) {
      path = `${parentAccount.accountName} > ${path}`;
      parent = parentAccount.parentAccount;
    } else {
      break;
    }
  }
  
  return path;
};

// 方法：檢查是否可以刪除
schema.methods.canDelete = async function() {
  // 檢查是否有子科目
  const childCount = await this.constructor.countDocuments({ parentAccount: this._id });
  if (childCount > 0) {
    return { canDelete: false, reason: '此科目有子科目，無法刪除' };
  }

  // 檢查是否有交易記錄
  const JournalEntry = mongoose.model('JournalEntry');
  const entryCount = await JournalEntry.countDocuments({
    $or: [
      { 'entries.debitAccount': this._id },
      { 'entries.creditAccount': this._id }
    ]
  });
  
  if (entryCount > 0) {
    return { canDelete: false, reason: '此科目已有交易記錄，無法刪除' };
  }

  return { canDelete: true };
};

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ChartOfAccounts', schema);
