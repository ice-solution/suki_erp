const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const ShipQuoteModel = mongoose.model('ShipQuote');

const {
  aggregateInvoicedQtyByQuoteLine,
  aggregateInvoicedQtyByShipQuoteLine,
} = require('@/helpers/quoteInvoiceFromQuote');
const { inferInvoiceConversionMode } = require('@/helpers/quoteInvoiceConversion');

function linePoNumber(item, headerPo) {
  return String(item?.poNumber || '').trim() || headerPo;
}

/**
 * 發票更新 items 數量時，同步 orderFromQuoteLines（仍關聯報價單／吊船報價時）。
 * 例：報價 10 件、本發票原開 6 → 改為 4 時，報價「已開票／餘額」應補回 2。
 */
async function syncInvoiceOrderFromSourceOnUpdate({ existingInvoice, body, items }) {
  if (inferInvoiceConversionMode(existingInvoice) === 'B') {
    return body;
  }

  const sourceQuoteId = existingInvoice.sourceQuote;
  const sourceShipQuoteId = existingInvoice.sourceShipQuote;

  if (!sourceQuoteId && !sourceShipQuoteId) {
    return body;
  }

  const oldLines = Array.isArray(existingInvoice.orderFromQuoteLines)
    ? existingInvoice.orderFromQuoteLines
    : [];
  if (oldLines.length === 0 || !Array.isArray(items)) {
    return body;
  }

  if (items.length !== oldLines.length) {
    throw new Error(
      '此發票由報價轉換而來，不可新增或刪除明細列，僅可調整數量（否則來源餘額無法對帳）'
    );
  }

  const isFromQuote = !!sourceQuoteId;
  const sourceDoc = isFromQuote
    ? await QuoteModel.findById(sourceQuoteId).exec()
    : await ShipQuoteModel.findById(sourceShipQuoteId).exec();

  if (!sourceDoc) {
    const label = isFromQuote ? '報價單' : '吊船報價';
    throw new Error(`關聯的${label}不存在，無法同步轉發票數量`);
  }

  const headerPo = String(sourceDoc.poNumber || '').trim();
  const sourceItems = sourceDoc.items || [];
  const resolvedPoNumber = String(
    (Object.prototype.hasOwnProperty.call(body, 'orderFromPoNumber')
      ? body.orderFromPoNumber
      : existingInvoice.orderFromPoNumber) ||
      (Object.prototype.hasOwnProperty.call(body, 'poNumber') ? body.poNumber : existingInvoice.poNumber) ||
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
      throw new Error(`此發票的來源行不屬於 P.O number：${resolvedPoNumber}`);
    }
  }

  const invoicedMapAll = isFromQuote
    ? await aggregateInvoicedQtyByQuoteLine(sourceDoc._id, resolvedPoNumber)
    : await aggregateInvoicedQtyByShipQuoteLine(sourceDoc._id, resolvedPoNumber);

  const updatedLines = oldLines.map((l, i) => {
    const newQty = Math.max(0, Math.floor(Number(items?.[i]?.quantity) || 0));
    return { itemIndex: l.itemIndex, quantity: newQty };
  });

  for (const l of updatedLines) {
    const idx = Math.floor(Number(l?.itemIndex));
    const newQty = Math.max(0, Math.floor(Number(l?.quantity) || 0));
    const quoteQty = Math.max(0, Math.floor(Number(sourceItems?.[idx]?.quantity) || 0));
    const invoicedAll = Math.max(0, Math.floor(Number(invoicedMapAll?.[idx] || 0)));
    const invoicedOthers = Math.max(0, invoicedAll - Math.max(0, oldQtyByLine[idx] || 0));
    const remainingForThisDoc = Math.max(0, quoteQty - invoicedOthers);
    if (newQty > remainingForThisDoc) {
      throw new Error(`第 ${idx + 1} 行開票數量 ${newQty} 超過來源餘額 ${remainingForThisDoc}`);
    }
  }

  body.orderFromPoNumber = resolvedPoNumber;
  body.orderFromQuoteLines = updatedLines;
  return body;
}

module.exports = {
  syncInvoiceOrderFromSourceOnUpdate,
};
