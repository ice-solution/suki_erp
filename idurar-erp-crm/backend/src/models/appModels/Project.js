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

  orderNumber: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    autopopulate: true,
  },

  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  contractor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Contractor',
    required: true,
  },
  contractorCost: {
    type: Number,
    required: true,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  poNumber: {
    type: String,
  },
  actualCost: {
    type: Number,
    default: 0,
  },
  projectItems: [{
    type: mongoose.Schema.ObjectId,
    ref: 'ProjectItem',
  }],
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

module.exports = mongoose.model('Project', schema); 