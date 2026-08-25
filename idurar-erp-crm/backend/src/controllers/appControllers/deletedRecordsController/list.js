const mongoose = require('mongoose');
const { buildQuoteNumberSearchMatch } = require('../../../helpers/paginatedQuoteSort');

const UPDATED_BY_POPULATE = { path: 'updatedBy', select: 'name surname email' };

const ENTITY_CONFIG = {
  quote: {
    modelName: 'Quote',
    populate: [
      { path: 'clients', select: 'name' },
      { path: 'client', select: 'name' },
      { path: 'followUpBy', select: 'name surname email' },
      UPDATED_BY_POPULATE,
    ],
  },
  shipquote: {
    modelName: 'ShipQuote',
    extraMatch: { type: '吊船' },
    populate: [
      { path: 'clients', select: 'name' },
      { path: 'client', select: 'name' },
      { path: 'followUpBy', select: 'name surname email' },
      UPDATED_BY_POPULATE,
    ],
  },
  supplierquote: {
    modelName: 'SupplierQuote',
    populate: [
      { path: 'supplier', select: 'name' },
      { path: 'followUpBy', select: 'name surname email' },
      UPDATED_BY_POPULATE,
    ],
  },
  invoice: {
    modelName: 'Invoice',
    populate: [
      { path: 'clients', select: 'name' },
      { path: 'client', select: 'name' },
      { path: 'followUpBy', select: 'name surname email' },
      UPDATED_BY_POPULATE,
    ],
  },
};

const ALLOWED_ENTITIES = Object.keys(ENTITY_CONFIG);

/**
 * GET /deleted-records/list?entity=quote|shipquote|supplierquote|invoice&page=1&items=10&q=
 */
const list = async (req, res) => {
  try {
    const entity = String(req.query.entity || '').trim().toLowerCase();
    if (!ALLOWED_ENTITIES.includes(entity)) {
      return res.status(400).json({
        success: false,
        result: [],
        pagination: { page: 1, pages: 0, count: 0 },
        message: `entity 必須為 ${ALLOWED_ENTITIES.join('、')} 之一`,
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.items, 10) || 10));
    const skip = (page - 1) * limit;
    const q = String(req.query.q || '').trim();

    const config = ENTITY_CONFIG[entity];
    const Model = mongoose.model(config.modelName);

    const baseMatch = {
      removed: true,
      ...(config.extraMatch || {}),
    };

    const searchFields = ['address', 'invoiceNumber', 'numberPrefix', 'number', 'contactPerson'];
    const matchQuery = q
      ? buildQuoteNumberSearchMatch(q, searchFields, baseMatch)
      : { ...baseMatch };

    let query = Model.find(matchQuery)
      .sort({ modified_at: -1, updated: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    for (const pop of config.populate || []) {
      query = query.populate(pop.path, pop.select);
    }

    const [result, count] = await Promise.all([query.lean().exec(), Model.countDocuments(matchQuery)]);
    const pages = Math.ceil(count / limit) || 0;
    const pagination = { page, pages, count };

    return res.status(count > 0 ? 200 : 203).json({
      success: true,
      result,
      pagination,
      message: count > 0 ? 'Successfully found deleted documents' : 'Collection is Empty',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: [],
      pagination: { page: 1, pages: 0, count: 0 },
      message: err.message || 'Server error',
    });
  }
};

module.exports = list;
