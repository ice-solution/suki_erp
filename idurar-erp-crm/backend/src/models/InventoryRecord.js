const mongoose = require('mongoose');

const InventoryRecordSchema = new mongoose.Schema({
  billNumber: { type: String, required: true },
  date: { type: Date, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
      unit: { type: Number, required: true },
      type: { type: String, enum: ['in', 'out'], required: true }
    }
  ]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' } });

module.exports = mongoose.model('InventoryRecord', InventoryRecordSchema); 