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

  // 期間名稱
  periodName: {
    type: String,
    required: true,
  },

  // 會計年度
  fiscalYear: {
    type: Number,
    required: true,
  },

  // 期間編號 (1-12 for monthly periods)
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },

  // 期間類型
  periodType: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly',
  },

  // 期間開始日期
  startDate: {
    type: Date,
    required: true,
  },

  // 期間結束日期
  endDate: {
    type: Date,
    required: true,
  },

  // 期間狀態
  status: {
    type: String,
    enum: ['open', 'closed', 'locked'],
    default: 'open',
  },

  // 是否為當前期間
  isCurrent: {
    type: Boolean,
    default: false,
  },

  // 關帳日期
  closedDate: {
    type: Date,
  },

  // 關帳者
  closedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 鎖定日期
  lockedDate: {
    type: Date,
  },

  // 鎖定者
  lockedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 期初餘額是否已建立
  openingBalanceCreated: {
    type: Boolean,
    default: false,
  },

  // 期末結轉是否已完成
  closingEntriesCompleted: {
    type: Boolean,
    default: false,
  },

  // 統計資訊
  statistics: {
    totalEntries: {
      type: Number,
      default: 0,
    },
    totalDebitAmount: {
      type: Number,
      default: 0,
    },
    totalCreditAmount: {
      type: Number,
      default: 0,
    },
    lastUpdateDate: {
      type: Date,
    }
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

// 確保同一時間只有一個當前期間
schema.pre('save', async function(next) {
  if (this.isCurrent && !this.isNew) {
    // 如果設為當前期間，將其他期間設為非當前
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isCurrent: false }
    );
  }
  next();
});

// 索引
schema.index({ fiscalYear: 1, periodNumber: 1 }, { unique: true });
schema.index({ startDate: 1, endDate: 1 });
schema.index({ status: 1 });
schema.index({ isCurrent: 1 });

// 靜態方法：獲取當前期間
schema.statics.getCurrentPeriod = function() {
  return this.findOne({ isCurrent: true, removed: false });
};

// 靜態方法：獲取指定日期的期間
schema.statics.getPeriodByDate = function(date) {
  return this.findOne({
    startDate: { $lte: date },
    endDate: { $gte: date },
    removed: false
  });
};

// 靜態方法：創建年度期間
schema.statics.createYearPeriods = async function(fiscalYear, startDate, createdBy) {
  const periods = [];
  const start = new Date(startDate);
  
  for (let i = 1; i <= 12; i++) {
    const periodStart = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
    const periodEnd = new Date(start.getFullYear(), start.getMonth() + i, 0);
    
    const period = new this({
      periodName: `${fiscalYear}年${i.toString().padStart(2, '0')}月`,
      fiscalYear,
      periodNumber: i,
      periodType: 'monthly',
      startDate: periodStart,
      endDate: periodEnd,
      status: 'open',
      isCurrent: i === 1, // 第一個月設為當前期間
      createdBy
    });
    
    periods.push(period);
  }
  
  return await this.insertMany(periods);
};

// 方法：關閉期間
schema.methods.closePeriod = async function(closedBy) {
  if (this.status === 'closed') {
    throw new Error('期間已關閉');
  }

  // 檢查是否有未過帳的分錄
  const JournalEntry = mongoose.model('JournalEntry');
  const unpostedEntries = await JournalEntry.countDocuments({
    accountingPeriod: this._id,
    isPosted: false,
    removed: false
  });

  if (unpostedEntries > 0) {
    throw new Error(`還有 ${unpostedEntries} 筆未過帳的分錄`);
  }

  // 更新統計資訊
  await this.updateStatistics();

  // 關閉期間
  this.status = 'closed';
  this.closedDate = new Date();
  this.closedBy = closedBy;

  await this.save();
};

// 方法：鎖定期間
schema.methods.lockPeriod = async function(lockedBy) {
  if (this.status !== 'closed') {
    throw new Error('只能鎖定已關閉的期間');
  }

  this.status = 'locked';
  this.lockedDate = new Date();
  this.lockedBy = lockedBy;

  await this.save();
};

// 方法：更新統計資訊
schema.methods.updateStatistics = async function() {
  const JournalEntry = mongoose.model('JournalEntry');
  
  const stats = await JournalEntry.aggregate([
    {
      $match: {
        accountingPeriod: this._id,
        isPosted: true,
        removed: false
      }
    },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  if (stats.length > 0) {
    this.statistics.totalEntries = stats[0].totalEntries;
    this.statistics.totalDebitAmount = stats[0].totalAmount;
    this.statistics.totalCreditAmount = stats[0].totalAmount;
  }
  
  this.statistics.lastUpdateDate = new Date();
  await this.save();
};

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('AccountingPeriod', schema);
