const mongoose = require('mongoose');

const warehouseInventorySchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'Admin' 
  },
  
  // 貨品信息
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
    unique: true,
    sparse: true, // 允許空值但確保唯一性
    trim: true,
  },
  
  // 數量信息
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  
  // 倉庫信息
  warehouse: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  
  // 價格信息
  unitPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalValue: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  // 供應商信息
  supplier: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
  },
  
  // 項目關聯
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  
  // 庫存狀態
  status: {
    type: String,
    enum: ['available', 'reserved', 'out_of_stock', 'damaged'],
    default: 'available',
  },
  
  // 最低庫存警告
  minStockLevel: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  // 位置信息
  location: {
    type: String,
    trim: true,
  },
  
  // 備註
  notes: {
    type: String,
    trim: true,
  },
  
  // 最後更新時間
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  
}, {
  timestamps: true,
});

// 索引
warehouseInventorySchema.index({ warehouse: 1, itemName: 1 });
warehouseInventorySchema.index({ sku: 1 });
warehouseInventorySchema.index({ supplier: 1 });
warehouseInventorySchema.index({ project: 1 });
warehouseInventorySchema.index({ status: 1 });

// 虛擬字段：倉庫顯示名稱
warehouseInventorySchema.virtual('warehouseDisplay').get(function() {
  const warehouseMap = {
    'A': '倉A',
    'B': '倉B', 
    'C': '倉C',
    'D': '倉D'
  };
  return warehouseMap[this.warehouse] || this.warehouse;
});

// 虛擬字段：狀態顯示名稱
warehouseInventorySchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'available': '可用',
    'reserved': '已預留',
    'out_of_stock': '缺貨',
    'damaged': '損壞'
  };
  return statusMap[this.status] || this.status;
});

// 自動計算總價值
warehouseInventorySchema.pre('save', function(next) {
  this.totalValue = this.quantity * this.unitPrice;
  this.lastUpdated = new Date();
  next();
});

// 確保JSON序列化包含虛擬字段
warehouseInventorySchema.set('toJSON', { virtuals: true });
warehouseInventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WarehouseInventory', warehouseInventorySchema);
