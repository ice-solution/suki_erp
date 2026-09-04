const mongoose = require('mongoose');
const {
  fetchPaginatedBySupplierQuoteNumberSort,
  buildQuoteNumberSearchMatch,
  buildWithinPrefixSearchMatch,
} = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('SupplierQuote');

const DEFAULT_SEARCH_FIELDS = [
  'address',
  'invoiceNumber',
  'numberPrefix',
  'number',
  'poNumber',
  'counterpartyInvoiceNumber',
];

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const { filter, equal } = req.query;
  const q = String(req.query.q || '').trim();
  const fieldsArray = req.query.fields
    ? String(req.query.fields)
        .split(',')
        .map((f) => String(f || '').trim())
        .filter(Boolean)
    : [];

  const hasPrefixFilter =
    filter != null &&
    String(filter).trim() === 'numberPrefix' &&
    equal != null &&
    String(equal) !== '';

  let matchQuery = { removed: false };

  if (filter != null && String(filter).trim() !== '' && equal != null && String(equal) !== '') {
    matchQuery[filter] = equal;
  }

  if (q) {
    const searchFields = fieldsArray.length > 0 ? fieldsArray : DEFAULT_SEARCH_FIELDS;
    if (hasPrefixFilter) {
      matchQuery = buildWithinPrefixSearchMatch(q, equal, searchFields, { removed: false });
    } else {
      matchQuery = buildQuoteNumberSearchMatch(q, searchFields, matchQuery);
    }
  }

  const result = await fetchPaginatedBySupplierQuoteNumberSort(Model, matchQuery, skip, limit, {
    populate: [
      { path: 'createdBy', select: 'name surname email' },
      { path: 'followUpBy', select: 'name surname email' },
      { path: 'supplier', select: 'name' },
    ],
  });

  const count = await Model.countDocuments(matchQuery);
  const pages = Math.ceil(count / limit);
  const pagination = { page, pages, count };

  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  }

  return res.status(203).json({
    success: false,
    result: [],
    pagination,
    message: 'Collection is Empty',
  });
};

module.exports = paginatedList;
