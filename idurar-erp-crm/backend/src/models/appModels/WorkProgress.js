const mongoose = require('mongoose');

const workProgressSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: true,
  },
  
  // 項目關聯
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: true,
    autopopulate: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },

  poNumber: {
    type: String,
  },
  
  // 單個工作項目（從Quote item複製）
  item: {
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
      default: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    // 來源Quote信息
    sourceQuote: {
      type: String, // 例如: "QU-1"
    },
    sourceQuoteId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Quote',
    },
  },
  
  // 負責承包商員工（從Project contractors的員工中選擇）
  contractorEmployee: {
    type: mongoose.Schema.ObjectId,
    ref: 'ContractorEmployee',
    required: true,
    autopopulate: true,
  },
  
  // 工作計劃
  days: {
    type: Number,
    default: 1, // 不再required，保持向後兼容
  },
  
  // 完工日期
  completionDate: {
    type: Date,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expectedEndDate: {
    type: Date,
  },
  actualEndDate: {
    type: Date,
  },
  
  // 進度追蹤
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  
  // 進度記錄歷史
  history: [{
    image: {
      type: String, // 圖片文件路徑
    },
    description: {
      type: String,
      required: true,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'Admin',
      required: true,
    },
    // 累計進度（這次記錄後的總進度）
    cumulativeProgress: {
      type: Number,
      min: 0,
      max: 100,
    },
  }],
  
  // 備註
  notes: {
    type: String,
  },
  
  // 時間戳
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// 計算預期結束日期
workProgressSchema.pre('save', function(next) {
  if (this.startDate && this.days) {
    this.expectedEndDate = new Date(this.startDate.getTime() + (this.days * 24 * 60 * 60 * 1000));
  }
  
  // 如果進度達到100%，設置為完成
  if (this.progress >= 100) {
    this.status = 'completed';
    if (!this.actualEndDate) {
      this.actualEndDate = new Date();
    }
  } else if (this.progress > 0) {
    this.status = 'in_progress';
  }
  
  next();
});

workProgressSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('WorkProgress', workProgressSchema);
