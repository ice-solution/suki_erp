const Joi = require('joi');
const schema = Joi.object({
  // Support both old client and new clients fields for backward compatibility
  client: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  clients: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.object())).optional(),
  numberPrefix: Joi.string().valid('SMI', 'WSE', 'SP').optional(),
  number: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  year: Joi.number().required(),
  type: Joi.string().optional(),
  shipType: Joi.string().optional(),
  subcontractorCount: Joi.number().optional(),
  costPrice: Joi.number().optional(),
  status: Joi.string().optional(),
  notes: Joi.string().allow(''),
  date: Joi.date().required(),
  paymentDueDate: Joi.date().optional(),
  expiredDate: Joi.date().allow(null, '').optional(), // Invoice 無 expiredDate，選填避免 required 錯誤
  paymentTerms: Joi.string().optional(),
  paymentStatus: Joi.string().optional(),
  credit: Joi.number().min(0).optional(),
  paymentEntries: Joi.array()
    .items(
      Joi.object({
        _id: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
        paymentStatus: Joi.string().valid('unpaid', 'paid').optional(),
        paymentDueDate: Joi.date().allow(null, '').optional(),
        paymentTerms: Joi.string().valid('即時付款', '一個月', '兩個月', '三個月').optional(),
        credit: Joi.number().min(0).optional(),
        paidDate: Joi.date().allow(null, '').optional(),
      })
        .unknown(true) // 允許 mongoose subdocument 自動產生的欄位（如 _id）
        .optional()
    )
    .optional(),
  fullPaid: Joi.boolean().optional(),
  isCompleted: Joi.boolean().optional(),
  invoiceNumber: Joi.string().allow('').optional(),
  contactPerson: Joi.string().allow('').optional(),
  address: Joi.string().allow('').optional(),
  // array cannot be empty
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().allow('').optional(),
        itemName: Joi.string().required(),
        description: Joi.string().allow(''),
        quantity: Joi.number().required(),
        unit: Joi.string().allow('').optional(),
        price: Joi.number().required(),
        total: Joi.number().required(),
      }).required()
    )
    .required(),
  // Support both old taxRate and new discount
  taxRate: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  discount: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  // Allow additional fields
}).unknown(true) // Allow additional fields not specified in schema
  .custom((value, helpers) => {
    // Ensure at least one client field is provided
    if (!value.client && (!value.clients || value.clients.length === 0)) {
      return helpers.error('any.required', { message: '"client" or "clients" is required' });
    }
    return value;
  });

module.exports = schema;
