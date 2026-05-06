const mongoose = require('mongoose');
const { neighborsByCreatedDesc, neighborsByYearDescNumberAsc } = require('../_shared/neighbors');

/**
 * GET /shipquote/neighbors/:id?q=...
 * ShipQuote list 默認 year desc, number asc；search 則 createdAt desc
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const q = (req.query.q || '').trim();
  const Model = mongoose.model('ShipQuote');
  const baseMatch = { removed: false, type: '吊船' };

  if (q) {
    const { prevId, nextId } = await neighborsByCreatedDesc({
      Model,
      baseMatch,
      currentId: id,
      q,
      fieldsArray: ['address', 'invoiceNumber', 'number', 'numberPrefix', 'contactPerson'],
    });
    return res.status(200).json({ success: true, result: { prevId, nextId } });
  }

  const { prevId, nextId } = await neighborsByYearDescNumberAsc({
    Model,
    baseMatch,
    currentId: id,
  });
  return res.status(200).json({ success: true, result: { prevId, nextId } });
};

