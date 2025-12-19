const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const list = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  //  Query the database for a list of all results
  // 按 year 降序，然後按 number 升序排序
  const resultsPromise = Model.find({
    removed: false,
  })
    .skip(skip)
    .limit(limit)
    .sort({ year: -1, number: 1 })
    .populate('createdBy', 'name');

  // Counting the total documents
  const countPromise = Model.countDocuments({ removed: false });

  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);

  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
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
      message: 'Collection is Empty',
    });
  }
};

module.exports = list;
