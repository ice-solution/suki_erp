const { neighborsForQuoteDefault } = require('../_shared/neighbors');

/**
 * GET /quote/neighbors/:id
 * 上/下一筆依列表預設排序（SML 先於 QU，單號數字由小到大）。
 * 查詢參數 q 已忽略（search 後仍與一般列表同一套 neighbors）。
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;

  const { prevId, nextId } = await neighborsForQuoteDefault({ currentId: id });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};
