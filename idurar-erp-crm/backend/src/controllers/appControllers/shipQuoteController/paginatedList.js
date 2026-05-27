const mongoose = require('mongoose');
const {
  buildQuoteNumberSearchMatch,
  fetchPaginatedByQuoteNumberSort,
} = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('ShipQuote');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items, 10) || 10;
  const skip = page * limit - limit;

  const { sortBy, sortValue, filter, equal } = req.query;
  const q = req.query.q != null ? String(req.query.q).trim() : '';

  const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

  const baseMatch = { removed: false, type: '吊船' };
  if (filter != null && filter !== '' && filter !== 'undefined') {
    baseMatch[filter] = equal;
  }

  const matchQuery = q
    ? buildQuoteNumberSearchMatch(q, fieldsArray, baseMatch)
    : { ...baseMatch };

  let result;
  let count;

  if (!sortBy) {
    result = await fetchPaginatedByQuoteNumberSort(Model, matchQuery, skip, limit, {
      includePrefixRank: false,
      populate: [{ path: 'createdBy', select: 'name surname email' }],
    });
    count = await Model.countDocuments(matchQuery);
  } else {
    const sortObj = { [sortBy]: sortValue || 1 };
    result = await Model.find(matchQuery)
      .skip(skip)
      .limit(limit)
      .sort(sortObj)
      .populate('createdBy', 'name surname email')
      .exec();
    count = await Model.countDocuments(matchQuery);
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
