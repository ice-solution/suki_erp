const mongoose = require('mongoose');

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

  // 默認排序：numberPrefix 先 SML 再 QU，其次 year 降序、number 升序（與列表期望一致）
  let result;
  let count;

  if (!sortBy) {
    const orderedIds = await Model.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          _prefixRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$numberPrefix', 'SML'] }, then: 0 },
                { case: { $eq: ['$numberPrefix', 'QU'] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: { _prefixRank: 1, year: -1, number: 1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);

    const ids = orderedIds.map((d) => d._id);
    if (ids.length === 0) {
      result = [];
    } else {
      const docs = await Model.find({ _id: { $in: ids } })
        .populate('createdBy', 'name surname email')
        .populate('updatedBy', 'name surname email')
        .exec();
      const orderMap = new Map(ids.map((id, i) => [id.toString(), i]));
      result = [...docs].sort(
        (a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString())
      );
    }

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
