const mongoose = require('mongoose');

const projectItemSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  
  // 項目名稱
  itemName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  
  // 描述
  description: {
    type: String,
    trim: true,
  },
  
  // 預設價格
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // 單位
  unit: {
    type: String,
    default: '個',
  },
  
  // 分類
  category: {
    type: String,
    enum: ['建材', '人工', '服務', '設備', '其他'],
    default: '建材',
  },
  
  // 是否常用項目
  isFrequent: {
    type: Boolean,
    default: false,
  },
  
  // 供應商信息（可選）- 暫時註釋掉，直到Supplier模型可用
  // supplier: {
  //   type: mongoose.Schema.ObjectId,
  //   ref: 'Supplier',
  // },
  
  // 備註
  notes: {
    type: String,
  },
  
  // 創建和更新信息
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

// 添加索引
projectItemSchema.index({ itemName: 1, removed: 1 });
projectItemSchema.index({ category: 1, enabled: 1 });
projectItemSchema.index({ isFrequent: -1, itemName: 1 });

// 更新時間中間件
projectItemSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

// 插件
projectItemSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ProjectItem', projectItemSchema);
