const mongoose = require('mongoose');

const Model = mongoose.model('ShipQuote');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  //  Query the database for a list of all results
  const { sortBy, sortValue, filter, equal } = req.query;

  const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

  let fields;

  fields = fieldsArray.length === 0 ? {} : { $or: [] };

  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
  }

  //  Query the database for a list of all results
  // 默認按 year 降序，然後按 number 升序排序
  let sortObj = {};
  if (!sortBy) {
    // 如果沒有指定排序，使用默認排序：先按 year 降序，再按 number 升序
    sortObj = { year: -1, number: 1 };
  } else {
    sortObj = { [sortBy]: sortValue || 1 };
  }
  
  const resultsPromise = Model.find({
    removed: false,
    type: '吊船', // 只查詢吊船類型
    [filter]: equal,
    ...fields,
  })
    .skip(skip)
    .limit(limit)
    .sort(sortObj)
    .populate('createdBy', 'name')
    .exec();

  // Counting the total documents
  const countPromise = Model.countDocuments({
    removed: false,
    type: '吊船', // 只查詢吊船類型
    [filter]: equal,
    ...fields,
  });

  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);
  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };
  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: true,
      result: [],
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = paginatedList;


