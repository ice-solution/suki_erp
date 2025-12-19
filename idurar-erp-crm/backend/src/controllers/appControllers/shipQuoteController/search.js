const mongoose = require('mongoose');

const Model = mongoose.model('ShipQuote');

const search = async (req, res) => {
  try {
    const q = req.query.q;

    let result = await Model.find({
      removed: false,
      type: '吊船', // 只搜索吊船類型
      $or: [
        { number: { $regex: new RegExp(q, 'i') } },
        { invoiceNumber: { $regex: new RegExp(q, 'i') } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('number invoiceNumber')
      .exec();

    if (result.length >= 1) {
      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'No document found',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = search;


