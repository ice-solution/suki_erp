const mongoose = require('mongoose');
const Model = mongoose.model('Quote');
const {
  buildQuoteNumberSearchMatch,
  fetchPaginatedByQuoteNumberSort,
} = require('../../../helpers/paginatedQuoteSort');

const search = async (req, res) => {
  if (req.query.q === undefined || req.query.q === '' || req.query.q === ' ') {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found',
      })
      .end();
  }

  const searchTerm = req.query.q.trim();
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['address', 'invoiceNumber'];

  const match = buildQuoteNumberSearchMatch(searchTerm, fieldsArray, { removed: false });

  try {
    const results = await fetchPaginatedByQuoteNumberSort(Model, match, 0, 50, {
      includePrefixRank: true,
      populate: [
        { path: 'createdBy', select: 'name' },
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
