const mongoose = require('mongoose');
const { neighborsByCreatedDesc, neighborsByYearDescNumberAsc } = require('../_shared/neighbors');

/**
 * GET /invoice/neighbors/:id?q=...
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const q = (req.query.q || '').trim();
  const Model = mongoose.model('Invoice');

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

  const { prevId, nextId } = await neighborsByYearDescNumberAsc({
    Model,
    baseMatch: { removed: false },
    currentId: id,
  });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};

