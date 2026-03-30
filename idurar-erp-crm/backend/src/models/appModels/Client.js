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

  accountCode: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: String,
  country: String,
  address: String,
  email: String,
  contacts: {
    type: [
      {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
      },
    ],
    default: [],
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

schema.pre('save', function (next) {
  if (Array.isArray(this.contacts)) {
    this.contacts = this.contacts.filter(
      (c) => c && (String(c.name || '').trim() || String(c.phone || '').trim())
    );
  }
  next();
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Client', schema);
