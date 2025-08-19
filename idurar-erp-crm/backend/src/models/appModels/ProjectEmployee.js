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

  // 關聯的項目
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: true,
    autopopulate: true,
  },

  // 關聯的員工
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'ContractorEmployee',
    required: true,
    autopopulate: true,
  },

  // 職位/角色
  position: {
    type: String,
    required: true,
  },

  // 日工資
  dailyWage: {
    type: Number,
    required: true,
    min: 0,
  },

  // 開始日期
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // 結束日期（可選）
  endDate: {
    type: Date,
  },

  // 狀態
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active',
  },

  // 備註
  notes: {
    type: String,
  },

  // 創建者
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

// 唯一索引：同一個員工在同一個項目中同時只能有一個active記錄
schema.index({ project: 1, employee: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'active' } 
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ProjectEmployee', schema);
