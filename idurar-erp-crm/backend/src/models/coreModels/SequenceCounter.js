const mongoose = require('mongoose');

const sequenceCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('SequenceCounter', sequenceCounterSchema);
