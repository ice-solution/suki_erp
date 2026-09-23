const mongoose = require('mongoose');
const {
  buildQuoteNumberSearchMatch,
  buildWithinPrefixSearchMatch,
  fetchPaginatedByInvoiceNumberSort,
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

  let result;
  let count;

  if (!sortBy) {
    // 預設：SMI → WSE → SP；同前綴內 number（yymmxxx）由大到小
    result = await fetchPaginatedByInvoiceNumberSort(Model, matchQuery, skip, limit, {
      populate: [
        { path: 'createdBy', select: 'name surname email' },
        { path: 'followUpBy', select: 'name surname email' },
      ],
    });
    count = await Model.countDocuments(matchQuery);
  } else {
    const sortObj = { [sortBy]: sortValue || 1 };
    [result, count] = await Promise.all([
      Model.find(matchQuery)
        .skip(skip)
        .limit(limit)
        .sort(sortObj)
        .populate('createdBy', 'name surname email')
        .populate('followUpBy', 'name surname email')
        .exec(),
      Model.countDocuments(matchQuery),
    ]);
  }

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
