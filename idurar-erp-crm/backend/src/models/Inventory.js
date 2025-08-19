const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  cost: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' } });

module.exports = mongoose.model('Inventory', InventorySchema); 