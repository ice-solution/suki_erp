const mongoose = require('mongoose');
const { catchErrors } = require('@/handlers/errorHandlers');

const Model = mongoose.model('Ship');

// 列表：到期日最接近今天的排最前，無到期日的排最後
const list = catchErrors(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.items, 10) || 10;
  const skip = (page - 1) * limit;
  const { filter, equal, q, fields: fieldsParam } = req.query;

  const match = { removed: false };
  if (filter && equal !== undefined) match[filter] = equal;

  if (q && fieldsParam) {
    const fieldsArray = fieldsParam.split(',');
    match.$or = fieldsArray.map((f) => ({ [f]: { $regex: new RegExp(q, 'i') } }));
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        _nullLast: { $cond: [{ $eq: [{ $ifNull: ['$expiredDate', null] }, null] }, 1, 0] },
      },
    },
    { $sort: { _nullLast: 1, expiredDate: 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'admins',
        let: { ub: '$updatedBy' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $ne: ['$$ub', null] }, { $eq: ['$_id', '$$ub'] }],
              },
            },
          },
          { $project: { name: 1 } },
        ],
        as: '_updatedByLookup',
      },
    },
    {
      $addFields: {
        updatedBy: { $arrayElemAt: ['$_updatedByLookup', 0] },
      },
    },
    { $project: { _nullLast: 0, _updatedByLookup: 0 } },
  ];

  const countPipeline = [{ $match: match }, { $count: 'count' }];
  const [result, countResult] = await Promise.all([
    Model.aggregate(pipeline),
    Model.aggregate(countPipeline),
  ]);
  const count = countResult[0]?.count ?? 0;
  const pages = Math.ceil(count / limit) || 1;

  return res.status(result.length > 0 ? 200 : 203).json({
    success: true,
    result,
    pagination: { page, pages, count },
    message: result.length > 0 ? 'Successfully found all documents' : 'Collection is Empty',
  });
});

module.exports = list;
