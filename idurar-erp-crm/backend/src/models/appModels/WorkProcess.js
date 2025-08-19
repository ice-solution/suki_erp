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

  // 工序名稱
  name: {
    type: String,
    required: true,
  },

  // 工序描述
  description: {
    type: String,
  },

  // 工序編號/順序
  sequence: {
    type: Number,
    required: true,
    min: 1,
  },

  // 計劃開始日期
  plannedStartDate: {
    type: Date,
    required: true,
  },

  // 計劃結束日期
  plannedEndDate: {
    type: Date,
    required: true,
  },

  // 實際開始日期
  actualStartDate: {
    type: Date,
  },

  // 實際結束日期
  actualEndDate: {
    type: Date,
  },

  // 進度百分比 (0-100)
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // 狀態
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'],
    default: 'pending',
  },

  // 預計工時 (小時)
  estimatedHours: {
    type: Number,
    min: 0,
  },

  // 實際工時 (小時)
  actualHours: {
    type: Number,
    min: 0,
    default: 0,
  },

  // 負責人員
  assignedTo: [{
    type: mongoose.Schema.ObjectId,
    ref: 'ProjectEmployee',
  }],

  // 前置工序 (依賴關係)
  dependencies: [{
    type: mongoose.Schema.ObjectId,
    ref: 'WorkProcess',
  }],

  // 工序類型
  category: {
    type: String,
    enum: ['design', 'construction', 'testing', 'documentation', 'other'],
    default: 'other',
  },

  // 重要程度
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  // 預算成本
  budgetCost: {
    type: Number,
    min: 0,
  },

  // 實際成本
  actualCost: {
    type: Number,
    min: 0,
    default: 0,
  },

  // 備註
  notes: {
    type: String,
  },

  // 是否為里程碑
  isMilestone: {
    type: Boolean,
    default: false,
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
  
  // 自動更新狀態
  const now = new Date();
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.actualEndDate = this.actualEndDate || now;
  } else if (this.progress > 0 && this.status === 'pending') {
    this.status = 'in_progress';
    this.actualStartDate = this.actualStartDate || now;
  } else if (now > this.plannedEndDate && this.status !== 'completed' && this.status !== 'cancelled') {
    this.status = 'delayed';
  }
  
  next();
});

// 虛擬字段：是否超期
schema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.plannedEndDate;
});

// 虛擬字段：剩餘天數
schema.virtual('remainingDays').get(function() {
  if (this.status === 'completed') return 0;
  const now = new Date();
  const diff = this.plannedEndDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// 確保虛擬字段被序列化
schema.set('toJSON', { virtuals: true });
schema.set('toObject', { virtuals: true });

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('WorkProcess', schema);
