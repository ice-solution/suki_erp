const mongoose = require('mongoose');
const { fetchPaginatedBySupplierQuoteNumberSort } = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('SupplierQuote');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const matchQuery = { removed: false };

  const result = await fetchPaginatedBySupplierQuoteNumberSort(Model, matchQuery, skip, limit, {
    populate: [
      { path: 'createdBy', select: 'name surname email' },
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
