const mongoose = require('mongoose');

const shipQuoteSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  converted: {
    to: {
      type: String,
      enum: ['invoice'],
    },
    invoice: {
      type: mongoose.Schema.ObjectId,
      ref: 'Invoice',
    },
    supplierQuote: {
      type: mongoose.Schema.ObjectId,
      ref: 'SupplierQuote',
    },
  },
  numberPrefix: {
    type: String,
    enum: ['SML', 'QU', 'XX'],
    default: 'QU',
    required: true,
  },
  number: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['吊船'],
    default: '吊船',
    required: true,
  },
  // 吊船相關字段（必填）
  shipType: {
    type: String,
    enum: ['續租', '租貨'],
    required: true,
  },
  subcontractorCount: {
    type: Number,
  },
  costPrice: {
    type: Number,
  },
  content: String,
  date: {
    type: Date,
    required: true,
  },
  expiredDate: {
    type: Date,
    required: false,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  invoiceNumber: {
    type: String,
  },

  poNumber: {
    type: String,
  },
  contactPerson: {
    type: String,
  },
  address: {
    type: String,
  },

  // 向後兼容：保留舊的client字段
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    autopopulate: true,
  },
  // 新的多客戶字段
  clients: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    autopopulate: true,
  }],
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  items: [
    {
      itemName: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      poNumber: {
        type: String,
      },
      total: {
        type: Number,
        required: true,
      },
    },
  ],
  subTotal: {
    type: Number,
  },
  discountTotal: {
    type: Number,
  },
  total: {
    type: Number,
  },
  credit: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'NA',
    uppercase: true,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on hold'],
    default: 'draft',
  },
  approved: {
    type: Boolean,
    default: false,
  },
  isExpired: {
    type: Boolean,
    default: false,
  },
  pdf: {
    type: String,
  },
  files: [
    {
      id: String,
      name: String,
      path: String,
      description: String,
      isPublic: {
        type: Boolean,
        default: true,
      },
    },
  ],
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

shipQuoteSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('ShipQuote', shipQuoteSchema);

