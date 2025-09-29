const mongoose = require('mongoose');

const warehouseTransactionSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  
  // 關聯的庫存項目
  warehouseInventory: {
    type: mongoose.Schema.ObjectId,
    ref: 'WarehouseInventory',
    required: true,
  },
  
  // 交易類型
  transactionType: {
    type: String,
    enum: ['inbound', 'outbound', 'transfer', 'adjustment', 'damage'],
    required: true,
  },
  
  // 數量變動（正數為入庫，負數為出庫）
  quantityChange: {
    type: Number,
    required: true,
  },
  
  // 交易前數量
  quantityBefore: {
    type: Number,
    required: true,
  },
  
  // 交易後數量
  quantityAfter: {
    type: Number,
    required: true,
  },
  
  // 單價
  unitPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  // 總價值
  totalValue: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  // 來源倉庫（用於轉移）
  fromWarehouse: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
  },
  
  // 目標倉庫（用於轉移）
  toWarehouse: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
  },
  
  // 關聯項目
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  
  // 關聯供應商報價
  supplierQuote: {
    type: mongoose.Schema.ObjectId,
    ref: 'SupplierQuote',
  },
  
  // 關聯採購單
  purchaseOrder: {
    type: mongoose.Schema.ObjectId,
    ref: 'Purchase',
  },
  
  // 交易原因
  reason: {
    type: String,
    trim: true,
  },
  
  // 備註
  notes: {
    type: String,
    trim: true,
  },
  
  // 交易日期
  transactionDate: {
    type: Date,
    default: Date.now,
  },
  
}, {
  timestamps: true,
});

// 索引
warehouseTransactionSchema.index({ warehouseInventory: 1 });
warehouseTransactionSchema.index({ transactionType: 1 });
warehouseTransactionSchema.index({ transactionDate: -1 });
warehouseTransactionSchema.index({ project: 1 });
warehouseTransactionSchema.index({ supplierQuote: 1 });

// 虛擬字段：交易類型顯示名稱
warehouseTransactionSchema.virtual('transactionTypeDisplay').get(function() {
  const typeMap = {
    'inbound': '入庫',
    'outbound': '出庫',
    'transfer': '轉移',
    'adjustment': '調整',
    'damage': '損壞'
  };
  return typeMap[this.transactionType] || this.transactionType;
});

// 虛擬字段：倉庫顯示名稱
warehouseTransactionSchema.virtual('fromWarehouseDisplay').get(function() {
  if (!this.fromWarehouse) return null;
  const warehouseMap = {
    'A': '倉A',
    'B': '倉B', 
    'C': '倉C',
    'D': '倉D'
  };
  return warehouseMap[this.fromWarehouse] || this.fromWarehouse;
});

warehouseTransactionSchema.virtual('toWarehouseDisplay').get(function() {
  if (!this.toWarehouse) return null;
  const warehouseMap = {
    'A': '倉A',
    'B': '倉B', 
    'C': '倉C',
    'D': '倉D'
  };
  return warehouseMap[this.toWarehouse] || this.toWarehouse;
});

// 確保JSON序列化包含虛擬字段
warehouseTransactionSchema.set('toJSON', { virtuals: true });
warehouseTransactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WarehouseTransaction', warehouseTransactionSchema);
