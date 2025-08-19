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

  // 退回單號
  returnNumber: {
    type: String,
    required: true,
    unique: true,
  },

  // 退回日期
  returnDate: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // 退回項目清單
  items: [{
    // 庫存項目
    inventory: {
      type: mongoose.Schema.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    // 退回數量
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    // 退回時的單價（記錄用）
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    // 小計
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    // 備註
    notes: {
      type: String,
    },
  }],

  // 總計金額
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },

  // 退回狀態
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
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

  // 確認者（確認退回的人）
  confirmedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },

  // 確認時間
  confirmedAt: {
    type: Date,
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

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ProjectReturn', schema);
