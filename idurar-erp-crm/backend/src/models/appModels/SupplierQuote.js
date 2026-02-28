const mongoose = require('mongoose');

const supplierQuoteSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  converted: {
    type: Boolean,
    default: false,
  },
  numberPrefix: {
    type: String,
    enum: ['NO', 'PO', 'S', 'SWP', 'E', 'Y'],
    default: 'S',
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
    enum: ['人工', '服務', '材料', '服務&材料', '吊船'],
    required: true,
  },
  // 吊船相關字段
  shipType: {
    type: String,
    enum: ['續租', '租貨'],
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
  counterpartyInvoiceNumber: {
    type: String,
  },
  contactPerson: {
    type: String,
  },
  address: {
    type: String,
  },
  warehouse: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
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
  ship: {
    type: mongoose.Schema.ObjectId,
    ref: 'Ship',
    autopopulate: true,
  },
  winch: {
    type: mongoose.Schema.ObjectId,
    ref: 'Winch',
    autopopulate: true,
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
        required: false,
        default: 0,
      },
      total: {
        type: Number,
        required: false,
        default: 0,
      },
    },
  ],
  materials: [
    {
      warehouse: {
        type: String,
        enum: ['A', 'B', 'C', 'D'],
        required: true,
      },
      itemName: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: false,
        default: 0,
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
  dmFiles: [
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
  invoiceFiles: [
    {
      id: String,
      name: String,
      path: String,
      description: String,
      fileType: {
        type: String,
        enum: ['pdf', 'jpg', 'jpeg', 'png'],
      },
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

supplierQuoteSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('SupplierQuote', supplierQuoteSchema);
