const mongoose = require('mongoose');
const { neighborsBySmlNumberAsc } = require('../_shared/neighbors');

/**
 * GET /shipquote/neighbors/:id
 * 依 SML 單號數字由小到大（吊船 type）。查詢參數 q 已忽略。
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const Model = mongoose.model('ShipQuote');
  const baseMatch = { removed: false, type: '吊船' };

  const { prevId, nextId } = await neighborsBySmlNumberAsc({
    Model,
    baseMatch,
    currentId: id,
  });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};
