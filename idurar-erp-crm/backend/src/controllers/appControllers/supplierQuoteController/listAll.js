const mongoose = require('mongoose');
const { fetchPaginatedBySupplierQuoteNumberSort } = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('SupplierQuote');

const listAll = async (req, res) => {
  const matchQuery = { removed: false };

  const result = await fetchPaginatedBySupplierQuoteNumberSort(Model, matchQuery, 0, 100000, {
    populate: [{ path: 'createdBy', select: 'name' }],
  });

  if (result.length > 0) {
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found all documents',
    });
  }

  return res.status(203).json({
    success: false,
    result: [],
    message: 'Collection is Empty',
  });
};

module.exports = listAll;
