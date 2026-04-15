const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: false,
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  name: { type: String, required: true },
  surname: { type: String },
  photo: {
    type: String,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  modified_at: { type: Date },
  updatedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  role: {
    type: String,
    default: 'owner',
    enum: ['owner', 'admin', 'user'],
  },
  /**
   * 前端頁面權限（以 menu/page key 表示）
   * - undefined / null：視作未啟用權限控管（向後相容）
   * - []：表示無權限（除了 dashboard，前端可自行保留）
   */
  permissions: [{ type: String }],
});

module.exports = mongoose.model('Admin', adminSchema);
