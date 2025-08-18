const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, required: true },
  cost: { type: Number, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' } });

module.exports = mongoose.model('Inventory', InventorySchema); 