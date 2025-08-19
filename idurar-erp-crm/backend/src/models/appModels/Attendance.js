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

  // 關聯的項目員工
  projectEmployee: {
    type: mongoose.Schema.ObjectId,
    ref: 'ProjectEmployee',
    required: true,
    autopopulate: true,
  },

  // 考勤日期
  date: {
    type: Date,
    required: true,
  },

  // 出席狀態
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'overtime', 'sick', 'vacation'],
    required: true,
  },

  // 上班時間
  clockIn: {
    type: Date,
  },

  // 下班時間
  clockOut: {
    type: Date,
  },

  // 工作小時數
  hoursWorked: {
    type: Number,
    min: 0,
    max: 24,
  },

  // 加班小時數
  overtimeHours: {
    type: Number,
    min: 0,
    default: 0,
  },

  // 實際工資（基於狀態和工作時間計算）
  actualWage: {
    type: Number,
    min: 0,
  },

  // 加班費
  overtimePay: {
    type: Number,
    min: 0,
    default: 0,
  },

  // 總薪資
  totalPay: {
    type: Number,
    min: 0,
  },

  // 工作描述/任務
  workDescription: {
    type: String,
  },

  // 備註
  notes: {
    type: String,
  },

  // 是否已確認
  confirmed: {
    type: Boolean,
    default: false,
  },

  // 確認者
  confirmedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 確認時間
  confirmedAt: {
    type: Date,
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
  
  // 自動計算工作小時數
  if (this.clockIn && this.clockOut) {
    const diffMs = this.clockOut - this.clockIn;
    this.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // 保留兩位小數
  }
  
  next();
});

// 唯一索引：同一個項目員工在同一天只能有一條記錄
schema.index({ projectEmployee: 1, date: 1 }, { unique: true });

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Attendance', schema);
