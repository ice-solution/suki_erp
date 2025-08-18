const mongoose = require('mongoose');

const InventoryRecordSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  unit: { type: Number, required: true },
  type: { type: String, enum: ['in', 'out'], required: true }, // 入倉/出倉
  date: { type: Date, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  // project_id 之後再加
}, { timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' } });

module.exports = mongoose.model('InventoryRecord', InventoryRecordSchema); 