const mongoose = require('mongoose');
const {
  buildQuoteNumberSearchMatch,
  fetchPaginatedByQuoteNumberSort,
} = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('ShipQuote');

const search = async (req, res) => {
  if (req.query.q === undefined || req.query.q === '' || req.query.q === ' ') {
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found',
    });
  }

  const searchTerm = req.query.q.trim();
  const fieldsArray = req.query.fields
    ? req.query.fields.split(',')
    : ['address', 'invoiceNumber', 'number', 'numberPrefix'];

  const match = buildQuoteNumberSearchMatch(searchTerm, fieldsArray, {
    removed: false,
    type: '吊船',
  });

  try {
    const results = await fetchPaginatedByQuoteNumberSort(Model, match, 0, 50, {
      includePrefixRank: false,
      populate: [
        { path: 'createdBy', select: 'name surname email' },
        { path: 'clients', select: 'name' },
        { path: 'client', select: 'name' },
      ],
    });

    if (results.length >= 1) {
      return res.status(200).json({
        success: true,
        result: results,
        message: 'Successfully found all documents',
      });
    }
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: [],
      message: error.message || 'Oops there is an Error',
    });
  }
};

module.exports = search;
