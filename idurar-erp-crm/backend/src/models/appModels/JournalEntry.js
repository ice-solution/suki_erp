const mongoose = require('mongoose');

const entryLineSchema = new mongoose.Schema({
  // 借方科目
  debitAccount: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChartOfAccounts',
  },

  // 貸方科目
  creditAccount: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChartOfAccounts',
  },

  // 金額
  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  // 摘要說明
  description: {
    type: String,
    required: true,
  },
}, { _id: true });

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  // 分錄編號
  entryNumber: {
    type: String,
    required: true,
    unique: true,
  },

  // 交易日期
  transactionDate: {
    type: Date,
    required: true,
  },

  // 記帳日期
  postingDate: {
    type: Date,
    default: Date.now,
  },

  // 分錄類型
  entryType: {
    type: String,
    enum: ['manual', 'automatic', 'adjustment', 'closing'],
    default: 'manual',
  },

  // 來源類型
  sourceType: {
    type: String,
    enum: ['invoice', 'payment', 'project', 'inventory', 'manual', 'other'],
    default: 'manual',
  },

  // 來源文件ID
  sourceDocument: {
    type: mongoose.Schema.ObjectId,
    refPath: 'sourceModel'
  },

  // 來源文件模型
  sourceModel: {
    type: String,
    enum: ['Invoice', 'Payment', 'Inventory']
  },

  // 來源文件編號
  sourceDocumentNumber: {
    type: String,
  },

  // 會計期間
  accountingPeriod: {
    type: mongoose.Schema.ObjectId,
    ref: 'AccountingPeriod',
    required: true,
  },

  // 分錄明細
  entries: [entryLineSchema],

  // 總金額
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  // 摘要
  description: {
    type: String,
    required: true,
  },

  // 備註
  notes: {
    type: String,
  },

  // 分錄狀態
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed', 'cancelled'],
    default: 'draft',
  },

  // 是否已過帳
  isPosted: {
    type: Boolean,
    default: false,
  },

  // 過帳時間
  postedAt: {
    type: Date,
  },

  // 過帳者
  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 沖銷分錄（如果這是沖銷分錄）
  reversalOf: {
    type: mongoose.Schema.ObjectId,
    ref: 'JournalEntry',
  },

  // 沖銷分錄（被此分錄沖銷的分錄）
  reversedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'JournalEntry',
  },

  // 沖銷原因
  reversalReason: {
    type: String,
  },

  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

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
  
  // 計算總金額
  if (this.entries && this.entries.length > 0) {
    this.totalAmount = this.entries.reduce((sum, entry) => sum + entry.amount, 0);
  }
  
  next();
});

// 驗證借貸平衡
schema.pre('save', function(next) {
  if (this.entries && this.entries.length > 0) {
    let debitTotal = 0;
    let creditTotal = 0;
    
    this.entries.forEach(entry => {
      if (entry.debitAccount) {
        debitTotal += entry.amount;
      }
      if (entry.creditAccount) {
        creditTotal += entry.amount;
      }
    });
    
    if (Math.abs(debitTotal - creditTotal) > 0.01) { // 允許小數點誤差
      return next(new Error('借方與貸方金額不平衡'));
    }
  }
  next();
});

// 索引
schema.index({ entryNumber: 1 });
schema.index({ transactionDate: 1 });
schema.index({ accountingPeriod: 1 });
schema.index({ status: 1 });
schema.index({ sourceType: 1, sourceDocument: 1 });

// 方法：過帳
schema.methods.post = async function() {
  if (this.isPosted) {
    throw new Error('分錄已過帳');
  }

  // 更新科目餘額
  const ChartOfAccounts = mongoose.model('ChartOfAccounts');
  
  for (const entry of this.entries) {
    if (entry.debitAccount) {
      await ChartOfAccounts.findByIdAndUpdate(
        entry.debitAccount,
        { $inc: { currentBalance: entry.amount } }
      );
    }
    
    if (entry.creditAccount) {
      await ChartOfAccounts.findByIdAndUpdate(
        entry.creditAccount,
        { $inc: { currentBalance: -entry.amount } }
      );
    }
  }

  // 更新分錄狀態
  this.status = 'posted';
  this.isPosted = true;
  this.postedAt = new Date();
  
  await this.save();
};

// 方法：沖銷
schema.methods.reverse = async function(reason, reversedBy) {
  if (!this.isPosted) {
    throw new Error('只能沖銷已過帳的分錄');
  }

  if (this.status === 'reversed') {
    throw new Error('分錄已被沖銷');
  }

  // 創建沖銷分錄
  const JournalEntry = mongoose.model('JournalEntry');
  const reversalEntries = this.entries.map(entry => ({
    debitAccount: entry.creditAccount,
    creditAccount: entry.debitAccount,
    amount: entry.amount,
    description: `沖銷：${entry.description}`
  }));

  const reversalEntry = new JournalEntry({
    entryNumber: `REV-${this.entryNumber}`,
    transactionDate: new Date(),
    entryType: 'adjustment',
    sourceType: 'manual',
    accountingPeriod: this.accountingPeriod,
    entries: reversalEntries,
    description: `沖銷分錄：${this.description}`,
    notes: `沖銷原因：${reason}`,
    status: 'posted',
    isPosted: true,
    postedAt: new Date(),
    postedBy: reversedBy,
    reversalOf: this._id,
    reversalReason: reason,
    createdBy: reversedBy
  });

  await reversalEntry.save();
  await reversalEntry.post();

  // 更新原分錄狀態
  this.status = 'reversed';
  this.reversedBy = reversalEntry._id;
  await this.save();

  return reversalEntry;
};

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('JournalEntry', schema);
