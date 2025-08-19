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
    unique: true,
  },
  description: {
    type: String,
  },
  color: {
    type: String,
    default: '#1890ff',
  },
  sortOrder: {
    type: Number,
    default: 0,
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

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ProjectType', schema);
