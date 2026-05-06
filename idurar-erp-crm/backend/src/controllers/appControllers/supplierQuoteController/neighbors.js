const mongoose = require('mongoose');
const { neighborsByCreatedDesc, neighborsByYearDescNumberAsc } = require('../_shared/neighbors');

/**
 * GET /supplierquote/neighbors/:id?q=...
 * list 默認 year desc, number asc；search 則 created desc
 */
module.exports = async function neighbors(req, res) {
  const id = req.params.id;
  const q = (req.query.q || '').trim();
  const Model = mongoose.model('SupplierQuote');

  if (q) {
    const { prevId, nextId } = await neighborsByCreatedDesc({
      Model,
      baseMatch: { removed: false },
      currentId: id,
      q,
      fieldsArray: ['address', 'invoiceNumber', 'number', 'numberPrefix', 'contactPerson', 'poNumber', 'counterpartyInvoiceNumber'],
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

