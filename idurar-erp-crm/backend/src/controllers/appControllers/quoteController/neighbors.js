const mongoose = require('mongoose');
const { neighborsForQuoteDefault, neighborsByCreatedDesc } = require('../_shared/neighbors');

/**
 * GET /quote/neighbors/:id?q=...
 * 回傳 Read page 上/下一筆的 _id（依列表預設排序；若有 q 則依 search 模式 created desc）
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const q = (req.query.q || '').trim();
  const Model = mongoose.model('Quote');

  if (q) {
    const { prevId, nextId } = await neighborsByCreatedDesc({
      Model,
      baseMatch: { removed: false },
      currentId: id,
      q,
      fieldsArray: ['address', 'invoiceNumber', 'numberPrefix', 'type', 'contactPerson'],
    });
    return res.status(200).json({ success: true, result: { prevId, nextId } });
  }

  const { prevId, nextId } = await neighborsForQuoteDefault({ currentId: id });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};

