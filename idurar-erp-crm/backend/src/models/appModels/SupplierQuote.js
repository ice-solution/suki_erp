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
    enum: ['續租', '租賃'],
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
  /** 出貨日期（必填；與上單日期 date 分開） */
  openDate: {
    type: Date,
    required: true,
  },
  expiredDate: {
    type: Date,
    required: false,
  },
  /** 安裝日期（選填） */
  installationDate: {
    type: Date,
    required: false,
  },
  /** 拆卸日期（選填） */
  dismantlingDate: {
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
  /** 簽收單送貨地址（多行），S 單 PDF「TO」下方顯示 */
  receiver: {
    type: String,
  },
  address: {
    type: String,
  },
  receiptDisplayName: {
    type: String,
  },
  /** S 單簽收區「裝箱方式」，對應 PDF s.pug */
  packingMethod: {
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
  supplier: {
    type: mongoose.Schema.ObjectId,
    ref: 'Supplier',
    autopopulate: true,
  },
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  /** 由 Quote 上單產生時：來源報價單 */
  sourceQuote: {
    type: mongoose.Schema.ObjectId,
    ref: 'Quote',
    required: false,
  },
  /** 由吊船報價上單產生時：來源 ShipQuote */
  sourceShipQuote: {
    type: mongoose.Schema.ObjectId,
    ref: 'ShipQuote',
    required: false,
  },
  /** 上單時選的 P.O number（與 Quote 行上的 poNumber 對齊） */
  orderFromPoNumber: {
    type: String,
    required: false,
  },
  /** 本次從 Quote 各行的上單數量（itemIndex 對應 quote.items 下標） */
  orderFromQuoteLines: [
    {
      itemIndex: { type: Number, required: true },
      quantity: { type: Number, required: true },
    },
  ],
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
      unit: {
        type: String,
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
      /** 存倉貨品 _id；倉 A–D 扣庫優先用此欄位，改名後仍可對應 */
      warehouseInventory: {
        type: mongoose.Schema.ObjectId,
        ref: 'WarehouseInventory',
        required: false,
      },
      warehouse: {
        type: String,
        enum: ['A', 'B', 'C', 'D', '供應商管理', '其他'],
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
      unitPrice: { type: Number },
      price: {
        type: Number,
        required: false,
        default: 0,
      },
      // 會計用：當「其他」+ 加工費 時為 'processing_fee'，供 accounting 計算
      accountingType: { type: String },
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
  showDiscountPercentOnPdf: {
    type: Boolean,
    default: true,
  },
  showDiscountAmountOnPdf: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on hold'],
    default: 'accepted',
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
  modified_at: { type: Date },
  updatedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
});

supplierQuoteSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('SupplierQuote', supplierQuoteSchema);
