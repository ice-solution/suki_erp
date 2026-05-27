const mongoose = require('mongoose');
const { fetchPaginatedByQuoteNumberSort } = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('Quote');

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

  const matchQuery = {
    removed: false,
    [filter]: equal,
    ...fields,
  };

  // 默認排序：SML 先於 QU，單號數字由小到大
  let result;
  let count;

  if (!sortBy) {
    result = await fetchPaginatedByQuoteNumberSort(Model, matchQuery, skip, limit, {
      includePrefixRank: true,
      populate: [
        { path: 'createdBy', select: 'name surname email' },
        { path: 'updatedBy', select: 'name surname email' },
      ],
    });
    count = await Model.countDocuments(matchQuery);
  } else {
    const sortObj = { [sortBy]: sortValue || 1 };
    result = await Model.find(matchQuery)
      .skip(skip)
      .limit(limit)
      .sort(sortObj)
      .populate('createdBy', 'name surname email')
      .populate('updatedBy', 'name surname email')
      .exec();
    count = await Model.countDocuments(matchQuery);
  }

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
