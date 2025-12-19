const Joi = require('joi');
const schema = Joi.object({
  // Support both old client and new clients fields for backward compatibility
  client: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  clients: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.object())).optional(),
  numberPrefix: Joi.string().optional(),
  number: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  year: Joi.number().required(),
  type: Joi.string().optional(),
  shipType: Joi.string().optional(),
  subcontractorCount: Joi.number().optional(),
  costPrice: Joi.number().optional(),
  status: Joi.string().optional(),
  notes: Joi.string().allow(''),
  expiredDate: Joi.date().optional(), // Changed to optional
  date: Joi.date().required(),
  invoiceDate: Joi.date().optional(),
  paymentDueDate: Joi.date().optional(),
  paymentTerms: Joi.string().optional(),
  paymentStatus: Joi.string().optional(),
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
