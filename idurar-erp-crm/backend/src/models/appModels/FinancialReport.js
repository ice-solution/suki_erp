const mongoose = require('mongoose');

const reportLineSchema = new mongoose.Schema({
  // 科目ID
  accountId: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChartOfAccounts',
    required: true,
  },

  // 科目代碼
  accountCode: {
    type: String,
    required: true,
  },

  // 科目名稱
  accountName: {
    type: String,
    required: true,
  },

  // 期初餘額
  openingBalance: {
    type: Number,
    default: 0,
  },

  // 本期借方發生額
  debitAmount: {
    type: Number,
    default: 0,
  },

  // 本期貸方發生額
  creditAmount: {
    type: Number,
    default: 0,
  },

  // 期末餘額
  endingBalance: {
    type: Number,
    default: 0,
  },

  // 在報表中的顯示順序
  displayOrder: {
    type: Number,
    default: 0,
  },

  // 是否為小計行
  isSubTotal: {
    type: Boolean,
    default: false,
  },

  // 是否為總計行
  isTotal: {
    type: Boolean,
    default: false,
  },

  // 縮排層級
  indentLevel: {
    type: Number,
    default: 0,
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

  // 報表編號
  reportNumber: {
    type: String,
    required: true,
    unique: true,
  },

  // 報表類型
  reportType: {
    type: String,
    enum: ['balance_sheet', 'income_statement', 'cash_flow', 'trial_balance', 'general_ledger'],
    required: true,
  },

  // 報表名稱
  reportName: {
    type: String,
    required: true,
  },

  // 會計期間
  accountingPeriod: {
    type: mongoose.Schema.ObjectId,
    ref: 'AccountingPeriod',
    required: true,
  },

  // 報表開始日期
  startDate: {
    type: Date,
    required: true,
  },

  // 報表結束日期
  endDate: {
    type: Date,
    required: true,
  },

  // 報表狀態
  status: {
    type: String,
    enum: ['draft', 'generated', 'approved', 'published'],
    default: 'draft',
  },

  // 報表明細
  reportLines: [reportLineSchema],

  // 報表摘要
  summary: {
    // 總資產
    totalAssets: {
      type: Number,
      default: 0,
    },
    // 總負債
    totalLiabilities: {
      type: Number,
      default: 0,
    },
    // 總權益
    totalEquity: {
      type: Number,
      default: 0,
    },
    // 總收入
    totalRevenue: {
      type: Number,
      default: 0,
    },
    // 總費用
    totalExpenses: {
      type: Number,
      default: 0,
    },
    // 淨利潤
    netIncome: {
      type: Number,
      default: 0,
    },
    // 毛利潤
    grossProfit: {
      type: Number,
      default: 0,
    },
    // 營業利潤
    operatingIncome: {
      type: Number,
      default: 0,
    },
  },

  // 報表參數
  parameters: {
    // 是否包含零餘額科目
    includeZeroBalance: {
      type: Boolean,
      default: false,
    },
    // 是否只顯示明細科目
    detailAccountsOnly: {
      type: Boolean,
      default: true,
    },
    // 比較期間
    comparisonPeriod: {
      type: mongoose.Schema.ObjectId,
      ref: 'AccountingPeriod',
    },
    // 其他自定義參數
    customParameters: {
      type: mongoose.Schema.Types.Mixed,
    },
  },

  // 生成時間
  generatedAt: {
    type: Date,
  },

  // 生成者
  generatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 審核時間
  approvedAt: {
    type: Date,
  },

  // 審核者
  approvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 發布時間
  publishedAt: {
    type: Date,
  },

  // 發布者
  publishedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 備註
  notes: {
    type: String,
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
schema.index({ reportNumber: 1 });
schema.index({ reportType: 1, accountingPeriod: 1 });
schema.index({ startDate: 1, endDate: 1 });
schema.index({ status: 1 });

// 靜態方法：生成資產負債表
schema.statics.generateBalanceSheet = async function(periodId, parameters = {}) {
  const ChartOfAccounts = mongoose.model('ChartOfAccounts');
  const JournalEntry = mongoose.model('JournalEntry');
  const AccountingPeriod = mongoose.model('AccountingPeriod');

  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw new Error('會計期間不存在');
  }

  // 獲取所有資產、負債、權益科目
  const accounts = await ChartOfAccounts.find({
    accountType: { $in: ['asset', 'liability', 'equity'] },
    removed: false,
    status: 'active'
  }).sort({ accountCode: 1 });

  const reportLines = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const account of accounts) {
    if (!parameters.includeZeroBalance && account.currentBalance === 0) {
      continue;
    }

    const line = {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      openingBalance: account.openingBalance,
      endingBalance: account.currentBalance,
      displayOrder: reportLines.length
    };

    if (account.accountType === 'asset') {
      totalAssets += account.currentBalance;
    } else if (account.accountType === 'liability') {
      totalLiabilities += account.currentBalance;
    } else if (account.accountType === 'equity') {
      totalEquity += account.currentBalance;
    }

    reportLines.push(line);
  }

  // 創建報表
  const report = new this({
    reportNumber: `BS-${period.fiscalYear}-${period.periodNumber.toString().padStart(2, '0')}`,
    reportType: 'balance_sheet',
    reportName: `資產負債表 - ${period.periodName}`,
    accountingPeriod: periodId,
    startDate: period.startDate,
    endDate: period.endDate,
    status: 'generated',
    reportLines,
    summary: {
      totalAssets,
      totalLiabilities,
      totalEquity
    },
    parameters,
    generatedAt: new Date(),
    createdBy: parameters.createdBy
  });

  return await report.save();
};

// 靜態方法：生成損益表
schema.statics.generateIncomeStatement = async function(periodId, parameters = {}) {
  const ChartOfAccounts = mongoose.model('ChartOfAccounts');
  const AccountingPeriod = mongoose.model('AccountingPeriod');

  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw new Error('會計期間不存在');
  }

  // 獲取所有收入、費用科目
  const accounts = await ChartOfAccounts.find({
    accountType: { $in: ['revenue', 'expense'] },
    removed: false,
    status: 'active'
  }).sort({ accountCode: 1 });

  const reportLines = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const account of accounts) {
    if (!parameters.includeZeroBalance && account.currentBalance === 0) {
      continue;
    }

    const line = {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      openingBalance: account.openingBalance,
      endingBalance: account.currentBalance,
      displayOrder: reportLines.length
    };

    if (account.accountType === 'revenue') {
      totalRevenue += Math.abs(account.currentBalance); // 收入通常為負餘額
    } else if (account.accountType === 'expense') {
      totalExpenses += account.currentBalance;
    }

    reportLines.push(line);
  }

  const netIncome = totalRevenue - totalExpenses;

  // 創建報表
  const report = new this({
    reportNumber: `IS-${period.fiscalYear}-${period.periodNumber.toString().padStart(2, '0')}`,
    reportType: 'income_statement',
    reportName: `損益表 - ${period.periodName}`,
    accountingPeriod: periodId,
    startDate: period.startDate,
    endDate: period.endDate,
    status: 'generated',
    reportLines,
    summary: {
      totalRevenue,
      totalExpenses,
      netIncome
    },
    parameters,
    generatedAt: new Date(),
    createdBy: parameters.createdBy
  });

  return await report.save();
};

// 方法：審核報表
schema.methods.approve = async function(approvedBy) {
  if (this.status !== 'generated') {
    throw new Error('只能審核已生成的報表');
  }

  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;

  await this.save();
};

// 方法：發布報表
schema.methods.publish = async function(publishedBy) {
  if (this.status !== 'approved') {
    throw new Error('只能發布已審核的報表');
  }

  this.status = 'published';
  this.publishedAt = new Date();
  this.publishedBy = publishedBy;

  await this.save();
};

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('FinancialReport', schema);
