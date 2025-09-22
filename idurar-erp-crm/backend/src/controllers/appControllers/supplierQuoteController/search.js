const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

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

  const fieldsArray = req.query.fields.split(',');

  const fields = { $or: [] };

  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
  }
  try {
    let results = await Model.find(fields).where({ removed: false }).sort({ name: 1 }).limit(10);

    if (results.length >= 1) {
      return res.status(200).json({
        success: true,
        result: results,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'No document found',
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }
};

module.exports = search;
