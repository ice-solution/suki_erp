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
    required: true,
  },
  serialNumber: {
    type: String,
  },
  status: {
    type: String,
    enum: ['normal', 'returned_warehouse_hk', 'returned_warehouse_cn', 'in_use'],
    default: 'normal',
  },
  supplierNumber: {
    type: String,
  },
  expiredDate: {
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
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Winch', schema);







