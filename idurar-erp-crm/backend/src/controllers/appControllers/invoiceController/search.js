const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');
const { buildQuoteNumberSearchMatch } = require('../../../helpers/paginatedQuoteSort');

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

  const searchTerm = String(req.query.q).trim();
  const fieldsArray = req.query.fields
    ? req.query.fields.split(',')
    : ['address', 'invoiceNumber', 'numberPrefix', 'number'];

  const match = buildQuoteNumberSearchMatch(searchTerm, fieldsArray, { removed: false });

  try {
    let results = await Model.find(match)
      .sort({ created: -1 })
      .limit(50)
      .populate('createdBy', 'name')
      .populate('followUpBy', 'name surname email')
      .populate('clients', 'name')
      .populate('client', 'name');

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
