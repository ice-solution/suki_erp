const mongoose = require('mongoose');

/**
 * 依 Quote + P.O number 彙總已轉成 Invoice 的數量（以 quote.items 的 itemIndex 為鍵）。
 */
async function aggregateInvoicedQtyByQuoteLine(quoteId, poNumber) {
  const InvoiceModel = mongoose.model('Invoice');
  const pn = String(poNumber || '').trim();
  if (!pn || !mongoose.Types.ObjectId.isValid(String(quoteId))) {
    return {};
  }
  const oid = new mongoose.Types.ObjectId(String(quoteId));
  const rows = await InvoiceModel.aggregate([
    {
      $match: {
        removed: false,
        'converted.quote': oid,
        orderFromPoNumber: pn,
      },
    },
    { $unwind: { path: '$orderFromQuoteLines', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: '$orderFromQuoteLines.itemIndex',
        qty: { $sum: '$orderFromQuoteLines.quantity' },
      },
    },
  ]);
  const map = {};
  for (const r of rows) {
    map[r._id] = r.qty;
  }
  return map;
}

/**
 * 依 ShipQuote + P.O number 彙總已轉 Invoice 的數量。
 */
async function aggregateInvoicedQtyByShipQuoteLine(shipQuoteId, poNumber) {
  const InvoiceModel = mongoose.model('Invoice');
  const pn = String(poNumber || '').trim();
  if (!pn || !mongoose.Types.ObjectId.isValid(String(shipQuoteId))) {
    return {};
  }
  const oid = new mongoose.Types.ObjectId(String(shipQuoteId));
  const rows = await InvoiceModel.aggregate([
    {
      $match: {
        removed: false,
        'converted.shipQuote': oid,
        orderFromPoNumber: pn,
      },
    },
    { $unwind: { path: '$orderFromQuoteLines', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: '$orderFromQuoteLines.itemIndex',
        qty: { $sum: '$orderFromQuoteLines.quantity' },
      },
    },
  ]);
  const map = {};
  for (const r of rows) {
    map[r._id] = r.qty;
  }
  return map;
}

module.exports = {
  aggregateInvoicedQtyByQuoteLine,
  aggregateInvoicedQtyByShipQuoteLine,
};
