const mongoose = require('mongoose');

/**
 * 依 Quote + P.O number 彙總已從報價單上單到 S 單的數量（以 quote.items 的 itemIndex 為鍵）。
 * 僅統計帶有 orderFromQuoteLines 的 SupplierQuote（新流程寫入的紀錄）。
 */
async function aggregateOrderedQtyByQuoteLine(quoteId, poNumber) {
  const SupplierQuoteModel = mongoose.model('SupplierQuote');
  const pn = String(poNumber || '').trim();
  if (!pn || !mongoose.Types.ObjectId.isValid(String(quoteId))) {
    return {};
  }
  const oid = new mongoose.Types.ObjectId(String(quoteId));
  const rows = await SupplierQuoteModel.aggregate([
    {
      $match: {
        removed: false,
        sourceQuote: oid,
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
 * 依 ShipQuote + P.O number 彙總已上單數量（以 shipQuote.items 的 itemIndex 為鍵）。
 */
async function aggregateOrderedQtyByShipQuoteLine(shipQuoteId, poNumber) {
  const SupplierQuoteModel = mongoose.model('SupplierQuote');
  const pn = String(poNumber || '').trim();
  if (!pn || !mongoose.Types.ObjectId.isValid(String(shipQuoteId))) {
    return {};
  }
  const oid = new mongoose.Types.ObjectId(String(shipQuoteId));
  const rows = await SupplierQuoteModel.aggregate([
    {
      $match: {
        removed: false,
        sourceShipQuote: oid,
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
  aggregateOrderedQtyByQuoteLine,
  aggregateOrderedQtyByShipQuoteLine,
};
