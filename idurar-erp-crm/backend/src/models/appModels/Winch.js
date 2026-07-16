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
  name: {
    type: String,
    required: false,
  },
  serialNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending_maintenance', 'normal', 'returned_warehouse_cn', 'returned_warehouse_hk', 'in_use', 'unavailable'],
    default: 'normal',
  },
  supplierNumber: {
    type: String,
  },
  expiredDate: {
    type: Date,
  },
  /** 安裝日期（使用中時由 S 單指派或於資產頁維護） */
  installationDate: {
    type: Date,
  },
  /** 拆卸日期 */
  dismantlingDate: {
    type: Date,
  },
  // 狀態為待回廠/香港倉時，記錄回廠日期
  returnDate: {
    type: Date,
  },
  description: {
    type: String,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  modified_at: { type: Date },
  updatedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Winch', schema);







