const mongoose = require('mongoose');
const { neighborsByYearDescNumberAsc } = require('../_shared/neighbors');

/**
 * GET /shipquote/neighbors/:id
 * 依 year desc、number asc（吊船 type）。查詢參數 q 已忽略。
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const Model = mongoose.model('ShipQuote');
  const baseMatch = { removed: false, type: '吊船' };

  const { prevId, nextId } = await neighborsByYearDescNumberAsc({
    Model,
    baseMatch,
    currentId: id,
  });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};
