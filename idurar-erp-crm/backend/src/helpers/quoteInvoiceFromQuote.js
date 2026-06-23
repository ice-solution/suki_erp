const mongoose = require('mongoose');

function buildQuoteSourceMatch(quoteId, poNumber) {
  const pn = String(poNumber || '').trim();
  const oid = new mongoose.Types.ObjectId(String(quoteId));
  return {
    removed: { $ne: true },
    $and: [
      { $or: [{ sourceQuote: oid }, { 'converted.quote': oid }] },
      { $or: [{ orderFromPoNumber: pn }, { poNumber: pn }] },
    ],
  };
}

function buildShipQuoteSourceMatch(shipQuoteId, poNumber) {
  const pn = String(poNumber || '').trim();
  const oid = new mongoose.Types.ObjectId(String(shipQuoteId));
  return {
    removed: { $ne: true },
    $and: [
      { $or: [{ sourceShipQuote: oid }, { 'converted.shipQuote': oid }] },
      { $or: [{ orderFromPoNumber: pn }, { poNumber: pn }] },
    ],
  };
}

/**
 * 依 Quote + P.O number 彙總已轉成 Invoice 的數量（A 模式；以 quote.items 的 itemIndex 為鍵）。
 */
async function aggregateInvoicedQtyByQuoteLine(quoteId, poNumber) {
  const InvoiceModel = mongoose.model('Invoice');
  const pn = String(poNumber || '').trim();
  if (!pn || !mongoose.Types.ObjectId.isValid(String(quoteId))) {
    return {};
  }
  const rows = await InvoiceModel.aggregate([
    { $match: buildQuoteSourceMatch(quoteId, poNumber) },
    { $unwind: { path: '$orderFromQuoteLines', preserveNullAndEmptyArrays: false } },
    {
      $match: {
        $or: [
          { 'orderFromQuoteLines.percentage': { $exists: false } },
          { 'orderFromQuoteLines.percentage': null },
        ],
      },
    },
    {
      $group: {
        _id: '$orderFromQuoteLines.itemIndex',
        qty: { $sum: { $ifNull: ['$orderFromQuoteLines.quantity', 0] } },
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
 * 依 ShipQuote + P.O number 彙總已轉 Invoice 的數量（A 模式）。
 */
async function aggregateInvoicedQtyByShipQuoteLine(shipQuoteId, poNumber) {
  const InvoiceModel = mongoose.model('Invoice');
  const pn = String(poNumber || '').trim();
  if (!pn || !mongoose.Types.ObjectId.isValid(String(shipQuoteId))) {
    return {};
  }
  const rows = await InvoiceModel.aggregate([
    { $match: buildShipQuoteSourceMatch(shipQuoteId, poNumber) },
    { $unwind: { path: '$orderFromQuoteLines', preserveNullAndEmptyArrays: false } },
    {
      $match: {
        $or: [
          { 'orderFromQuoteLines.percentage': { $exists: false } },
          { 'orderFromQuoteLines.percentage': null },
        ],
      },
    },
    {
      $group: {
        _id: '$orderFromQuoteLines.itemIndex',
        qty: { $sum: { $ifNull: ['$orderFromQuoteLines.quantity', 0] } },
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
 * 依 Quote 彙總 B 模式已轉專案佔比（逐 item；不含 excludeInvoiceId）。
 */
async function aggregateInvoicedPercentageByQuoteLine(quoteId, excludeInvoiceId = null) {
  const InvoiceModel = mongoose.model('Invoice');
  if (!mongoose.Types.ObjectId.isValid(String(quoteId))) {
    return {};
  }
  const match = {
    removed: { $ne: true },
    invoiceConversionMode: 'B',
    $or: [{ sourceQuote: new mongoose.Types.ObjectId(String(quoteId)) }, { 'converted.quote': new mongoose.Types.ObjectId(String(quoteId)) }],
  };
  if (excludeInvoiceId) {
    match._id = { $ne: new mongoose.Types.ObjectId(String(excludeInvoiceId)) };
  }
  const rows = await InvoiceModel.aggregate([
    { $match: match },
    { $unwind: { path: '$orderFromQuoteLines', preserveNullAndEmptyArrays: false } },
    {
      $match: {
        'orderFromQuoteLines.percentage': { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$orderFromQuoteLines.itemIndex',
        pct: { $sum: { $ifNull: ['$orderFromQuoteLines.percentage', 0] } },
      },
    },
  ]);
  const map = {};
  for (const r of rows) {
    map[r._id] = r.pct;
  }
  return map;
}

/**
 * 依 ShipQuote 彙總 B 模式已轉專案佔比（逐 item）。
 */
async function aggregateInvoicedPercentageByShipQuoteLine(shipQuoteId, excludeInvoiceId = null) {
  const InvoiceModel = mongoose.model('Invoice');
  if (!mongoose.Types.ObjectId.isValid(String(shipQuoteId))) {
    return {};
  }
  const match = {
    removed: { $ne: true },
    invoiceConversionMode: 'B',
    $or: [
      { sourceShipQuote: new mongoose.Types.ObjectId(String(shipQuoteId)) },
      { 'converted.shipQuote': new mongoose.Types.ObjectId(String(shipQuoteId)) },
    ],
  };
  if (excludeInvoiceId) {
    match._id = { $ne: new mongoose.Types.ObjectId(String(excludeInvoiceId)) };
  }
  const rows = await InvoiceModel.aggregate([
    { $match: match },
    { $unwind: { path: '$orderFromQuoteLines', preserveNullAndEmptyArrays: false } },
    {
      $match: {
        'orderFromQuoteLines.percentage': { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$orderFromQuoteLines.itemIndex',
        pct: { $sum: { $ifNull: ['$orderFromQuoteLines.percentage', 0] } },
      },
    },
  ]);
  const map = {};
  for (const r of rows) {
    map[r._id] = r.pct;
  }
  return map;
}

module.exports = {
  aggregateInvoicedQtyByQuoteLine,
  aggregateInvoicedQtyByShipQuoteLine,
  aggregateInvoicedPercentageByQuoteLine,
  aggregateInvoicedPercentageByShipQuoteLine,
};
