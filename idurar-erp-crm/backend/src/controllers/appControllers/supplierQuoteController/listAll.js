const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const listAll = async (req, res) => {
  //  Query the database for a list of all results
  // 按 year 降序，然後按 number 升序排序
  const result = await Model.find({ removed: false })
    .sort({ year: -1, number: 1 })
    .populate('createdBy', 'name');

  if (result.length > 0) {
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = listAll;
