const mongoose = require('mongoose');
const { neighborsForInvoiceDefault } = require('../_shared/neighbors');

/**
 * GET /invoice/neighbors/:id
 * 排序同列表：SMI → WSE → SP；同前綴內 number（yymmxxx）由大到小。
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const Model = mongoose.model('Invoice');

  const { prevId, nextId } = await neighborsForInvoiceDefault({
    Model,
    baseMatch: { removed: false },
    currentId: id,
  });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};
