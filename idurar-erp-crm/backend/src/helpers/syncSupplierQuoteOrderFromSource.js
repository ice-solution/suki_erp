const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const ShipQuoteModel = mongoose.model('ShipQuote');

const {
  aggregateOrderedQtyByQuoteLine,
  aggregateOrderedQtyByShipQuoteLine,
} = require('@/helpers/quoteSupplierOrderFromQuote');

function linePoNumber(item, headerPo) {
  return String(item?.poNumber || '').trim() || headerPo;
}

/**
 * S 單更新 items 數量時，同步 orderFromQuoteLines（僅當仍關聯報價單或吊船報價）。
 * 例：報價 10 件、本單原上單 6 → 改為 4 時，報價「已上單」應減 2、餘額補回。
 *
 * @param {object} params
 * @param {object} params.existingQuote 現有 S 單
 * @param {object} params.body 即將寫入的 body（會被修改）
 * @param {Array} params.items 新 items
 * @returns {object} body
 */
async function syncSupplierQuoteOrderFromSourceOnUpdate({ existingQuote, body, items }) {
  const sourceQuoteId = existingQuote.sourceQuote;
  const sourceShipQuoteId = existingQuote.sourceShipQuote;

  if (!sourceQuoteId && !sourceShipQuoteId) {
    return body;
  }

  const oldLines = Array.isArray(existingQuote.orderFromQuoteLines)
    ? existingQuote.orderFromQuoteLines
    : [];
  if (oldLines.length === 0 || !Array.isArray(items)) {
    return body;
  }

  const isFromQuote = !!sourceQuoteId;
  const sourceDoc = isFromQuote
    ? await QuoteModel.findById(sourceQuoteId).exec()
    : await ShipQuoteModel.findById(sourceShipQuoteId).exec();

  if (!sourceDoc) {
    const label = isFromQuote ? '報價單' : '吊船報價';
    throw new Error(`關聯的${label}不存在，無法同步上單數量`);
  }

  const headerPo = String(sourceDoc.poNumber || '').trim();
  const sourceItems = sourceDoc.items || [];
  const resolvedPoNumber = String(
    (Object.prototype.hasOwnProperty.call(body, 'orderFromPoNumber')
      ? body.orderFromPoNumber
      : existingQuote.orderFromPoNumber) ||
      (Object.prototype.hasOwnProperty.call(body, 'poNumber') ? body.poNumber : existingQuote.poNumber) ||
      ''
  ).trim();

  const oldQtyByLine = {};
  for (const l of oldLines) {
    const idx = Math.floor(Number(l?.itemIndex));
    const q = Math.max(0, Math.floor(Number(l?.quantity) || 0));
    if (!Number.isFinite(idx) || idx < 0) continue;
    oldQtyByLine[idx] = (oldQtyByLine[idx] || 0) + q;
  }

  if (!resolvedPoNumber) {
    throw new Error('P.O number is required');
  }

  for (const l of oldLines) {
    const idx = Math.floor(Number(l?.itemIndex));
    if (!Number.isFinite(idx) || idx < 0 || idx >= sourceItems.length) {
      throw new Error(`來源項目 itemIndex 無效：${idx}`);
    }
    if (linePoNumber(sourceItems[idx], headerPo) !== resolvedPoNumber) {
      throw new Error(`此 S 單的來源行不屬於 P.O number：${resolvedPoNumber}`);
    }
  }

  const orderedMapAll = isFromQuote
    ? await aggregateOrderedQtyByQuoteLine(sourceDoc._id, resolvedPoNumber)
    : await aggregateOrderedQtyByShipQuoteLine(sourceDoc._id, resolvedPoNumber);

  const updatedLines = oldLines.map((l, i) => {
    const newQty = Math.max(0, Math.floor(Number(items?.[i]?.quantity) || 0));
    return { itemIndex: l.itemIndex, quantity: newQty };
  });

  for (const l of updatedLines) {
    const idx = Math.floor(Number(l?.itemIndex));
    const newQty = Math.max(0, Math.floor(Number(l?.quantity) || 0));
    const quoteQty = Math.max(0, Math.floor(Number(sourceItems?.[idx]?.quantity) || 0));
    const orderedAll = Math.max(0, Math.floor(Number(orderedMapAll?.[idx] || 0)));
    const orderedOthers = Math.max(0, orderedAll - Math.max(0, oldQtyByLine[idx] || 0));
    const remainingForThisDoc = Math.max(0, quoteQty - orderedOthers);
    if (newQty > remainingForThisDoc) {
      throw new Error(`第 ${idx + 1} 行上單數量 ${newQty} 超過來源餘額 ${remainingForThisDoc}`);
    }
  }

  body.orderFromPoNumber = resolvedPoNumber;
  body.orderFromQuoteLines = updatedLines;
  return body;
}

module.exports = {
  syncSupplierQuoteOrderFromSourceOnUpdate,
};
