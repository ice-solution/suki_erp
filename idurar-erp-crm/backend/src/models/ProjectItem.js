const mongoose = require('mongoose');

const ProjectItemSchema = new mongoose.Schema({
  item_name: { type: String, required: true },
  price: { type: Number, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' } });

module.exports = mongoose.model('ProjectItem', ProjectItemSchema); 