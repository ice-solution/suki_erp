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

  // 關聯的工序
  workProcess: {
    type: mongoose.Schema.ObjectId,
    ref: 'WorkProcess',
    required: true,
    autopopulate: true,
  },

  // 關聯的項目
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: true,
    autopopulate: true,
  },

  // 記錄提交者（項目員工）
  submittedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'ProjectEmployee',
    required: true,
    autopopulate: true,
  },

  // 記錄日期
  recordDate: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // 工作描述
  workDescription: {
    type: String,
    required: true,
  },

  // 完成的工作內容
  completedWork: {
    type: String,
    required: true,
  },



  // 本次記錄的進度增量 (百分比)
  progressIncrement: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // 工作時數
  hoursWorked: {
    type: Number,
    min: 0,
    required: true,
  },

  // 材料使用情況
  materialsUsed: [{
    name: String,
    quantity: Number,
    unit: String,
    notes: String
  }],

  // 上傳的圖片
  images: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    description: String, // 圖片說明
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 工作地點
  location: {
    type: String,
  },





  // 質量檢查結果
  qualityCheck: {
    status: {
      type: String,
      enum: ['passed', 'failed', 'pending', 'not_applicable'],
      default: 'not_applicable'
    },
    notes: String,
    checkedBy: String
  },

  // 記錄狀態
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'submitted',
  },

  // 審核者
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 審核時間
  reviewedAt: {
    type: Date,
  },

  // 審核備註
  reviewNotes: {
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
});

// 更新時間中間件
schema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

// 索引
schema.index({ workProcess: 1, recordDate: -1 });
schema.index({ project: 1, recordDate: -1 });
schema.index({ submittedBy: 1, recordDate: -1 });

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('WorkProgressRecord', schema);
