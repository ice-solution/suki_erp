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
    enum: ['pending_maintenance', 'normal', 'returned_warehouse_cn', 'returned_warehouse_hk', 'in_use'],
    default: 'normal',
  },
  supplierNumber: {
    type: String,
  },
  expiredDate: {
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







