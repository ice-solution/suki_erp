const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const summary = async (req, res) => {
  let defaultType = 'month';

  const { type } = req.query;

  if (type && ['week', 'month', 'year'].includes(type)) {
    defaultType = type;
  } else if (type) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid type',
    });
  }

  const currentDate = new Date();
  const startDate = new Date();
  const endDate = new Date();

  if (defaultType === 'week') {
    startDate.setDate(currentDate.getDate() - 7);
    endDate.setDate(currentDate.getDate());
  } else if (defaultType === 'month') {
    startDate.setMonth(currentDate.getMonth() - 1);
    endDate.setMonth(currentDate.getMonth());
  } else if (defaultType === 'year') {
    startDate.setFullYear(currentDate.getFullYear() - 1);
    endDate.setFullYear(currentDate.getFullYear());
  }

  const result = await Model.aggregate([
    {
      $match: {
        removed: false,
        date: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        count: {
          $sum: 1,
        },
        total: {
          $sum: '$total',
        },
      },
    },
  ]);

  const total = result.length > 0 ? result[0].total : 0;
  const count = result.length > 0 ? result[0].count : 0;

  return res.status(200).json({
    success: true,
    result: { total, count },
    message: 'Successfully get summary of supplier quotes',
  });
};

module.exports = summary;
