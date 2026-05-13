const mongoose = require('mongoose');
const { neighborsByYearDescNumberAsc } = require('../_shared/neighbors');

/**
 * GET /invoice/neighbors/:id
 * 依 year desc、number asc。查詢參數 q 已忽略。
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const Model = mongoose.model('Invoice');

  const { prevId, nextId } = await neighborsByYearDescNumberAsc({
    Model,
    baseMatch: { removed: false },
    currentId: id,
  });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};
