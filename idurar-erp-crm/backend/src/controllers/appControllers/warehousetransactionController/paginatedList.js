const mongoose = require('mongoose');

const Model = mongoose.model('WarehouseTransaction');

/**
 * GET /warehousetransaction/list?page=1&items=20
 * 可選：warehouseInventory=<id>&transactionType=<type>
 */
const paginatedList = async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.items || '20', 10);
  const skip = page * limit - limit;

  const match = { removed: false };
  if (req.query.warehouseInventory) {
    match.warehouseInventory = req.query.warehouseInventory;
  }
  if (req.query.transactionType) {
    match.transactionType = req.query.transactionType;
  }

  const resultsPromise = Model.find(match)
    .skip(skip)
    .limit(limit)
    .sort({ transactionDate: -1, _id: -1 })
    .populate('warehouseInventory', 'itemName sku warehouse')
    .populate('createdBy', 'name')
    .lean()
    .exec();

  const countPromise = Model.countDocuments(match);

  const [result, count] = await Promise.all([resultsPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  const pagination = { page, pages, count };

  return res.status(200).json({
    success: true,
    result,
    pagination,
    message: 'Successfully found all documents',
  });
};

module.exports = paginatedList;

