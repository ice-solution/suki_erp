const mongoose = require('mongoose');
const {
  buildQuoteNumberSearchMatch,
  buildWithinPrefixSearchMatch,
} = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('Invoice');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const { sortBy, sortValue, filter, equal } = req.query;
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
    const searchFields =
      fieldsArray.length > 0
        ? fieldsArray
        : ['address', 'invoiceNumber', 'poNumber', 'contactPerson', 'numberPrefix', 'number'];
    if (hasPrefixFilter) {
      matchQuery = buildWithinPrefixSearchMatch(q, equal, searchFields, { removed: false });
    } else {
      matchQuery = buildQuoteNumberSearchMatch(q, searchFields, matchQuery);
    }
  }

  let sortObj = {};
  if (!sortBy) {
    sortObj = { year: -1, number: 1 };
  } else {
    sortObj = { [sortBy]: sortValue || 1 };
  }

  const [result, count] = await Promise.all([
    Model.find(matchQuery)
      .skip(skip)
      .limit(limit)
      .sort(sortObj)
      .populate('createdBy', 'name surname email')
      .populate('followUpBy', 'name surname email')
      .exec(),
    Model.countDocuments(matchQuery),
  ]);

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
    success: true,
    result: [],
    pagination,
    message: 'Collection is Empty',
  });
};

module.exports = paginatedList;
