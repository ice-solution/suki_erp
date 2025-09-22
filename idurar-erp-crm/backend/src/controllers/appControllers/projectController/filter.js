const mongoose = require('mongoose');

const Model = mongoose.model('Project');

const filter = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const { filter: filterValue, equal } = req.query;

  if (!filterValue || !equal) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Filter and equal parameters are required',
    });
  }

  const fieldsArray = filterValue.split(',');
  const query = { removed: false };

  // Add filter conditions
  if (fieldsArray.includes('status')) {
    query.status = equal;
  }
  if (fieldsArray.includes('costBy')) {
    query.costBy = equal;
  }
  if (fieldsArray.includes('supplier')) {
    query.suppliers = equal;
  }

  const resultsPromise = Model.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ created: -1 })
    .populate('createdBy', 'name')
    .populate('suppliers', 'name');

  const countPromise = Model.countDocuments(query);

  const [result, count] = await Promise.all([resultsPromise, countPromise]);

  const pages = Math.ceil(count / limit);
  const pagination = { page, pages, count };

  if (count > 0) {
    return res.status(200).json({
      success: true,
      result: { items: result },
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: { items: [] },
      pagination,
      message: 'No documents found',
    });
  }
};

module.exports = filter;
