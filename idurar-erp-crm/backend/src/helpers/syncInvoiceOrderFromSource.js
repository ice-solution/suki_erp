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

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * 由發票 items 重建 orderFromQuoteLines（A 模式數量）。
 * 優先用 item.sourceItemIndex；舊資料則以來源 itemName 對回舊 lines。
 * 刪除的來源行不會再出現 → 報價餘額自動退回。
 */
function rebuildOrderLinesFromItems({ items, oldLines, sourceItems }) {
  const list = Array.isArray(items) ? items : [];
  const previous = Array.isArray(oldLines) ? oldLines : [];
  const usedOld = new Set();
  const lines = [];

  for (const item of list) {
    const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    let sourceIdx = Math.floor(Number(item?.sourceItemIndex));

    if (!Number.isFinite(sourceIdx) || sourceIdx < 0) {
      const name = normalizeName(item?.itemName);
      let matchedOldPos = -1;
      for (let i = 0; i < previous.length; i += 1) {
        if (usedOld.has(i)) continue;
        const idx = Math.floor(Number(previous[i]?.itemIndex));
        if (!Number.isFinite(idx) || idx < 0 || idx >= sourceItems.length) continue;
        if (normalizeName(sourceItems[idx]?.itemName) === name) {
          matchedOldPos = i;
          sourceIdx = idx;
          break;
        }
      }
      if (matchedOldPos >= 0) {
        usedOld.add(matchedOldPos);
      } else {
        // 手動新增、無法對回來源的明細：不佔用開票餘額
        continue;
      }
    }

    if (!Number.isFinite(sourceIdx) || sourceIdx < 0 || sourceIdx >= sourceItems.length) {
      throw new Error(`來源項目 itemIndex 無效：${sourceIdx}`);
    }

    lines.push({
      itemIndex: sourceIdx,
      quantity: qty,
    });
  }

  return lines;
}

/**
 * 發票更新 items（含刪除）時，同步 orderFromQuoteLines（仍關聯報價單／吊船報價時）。
 * 例：報價 10 件、本發票原開 6 → 刪除該行或改為 4 時，報價「已開票／餘額」應退回。
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

  if (!resolvedPoNumber) {
    throw new Error('P.O number is required');
  }

  const oldQtyByLine = {};
  for (const l of oldLines) {
    const idx = Math.floor(Number(l?.itemIndex));
    const q = Math.max(0, Math.floor(Number(l?.quantity) || 0));
    if (!Number.isFinite(idx) || idx < 0) continue;
    oldQtyByLine[idx] = (oldQtyByLine[idx] || 0) + q;
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

  const updatedLines = rebuildOrderLinesFromItems({
    items,
    oldLines,
    sourceItems,
  });

  for (const l of updatedLines) {
    const idx = Math.floor(Number(l?.itemIndex));
    if (linePoNumber(sourceItems[idx], headerPo) !== resolvedPoNumber) {
      throw new Error(`第 ${idx + 1} 行不屬於 P.O number：${resolvedPoNumber}`);
    }
  }

  const invoicedMapAll = isFromQuote
    ? await aggregateInvoicedQtyByQuoteLine(sourceDoc._id, resolvedPoNumber)
    : await aggregateInvoicedQtyByShipQuoteLine(sourceDoc._id, resolvedPoNumber);

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

  // 回寫 sourceItemIndex，之後刪改不再靠陣列位置對帳
  body.items = items.map((item) => {
    const next = { ...(item && typeof item.toObject === 'function' ? item.toObject() : item) };
    if (next.sourceItemIndex != null && next.sourceItemIndex !== '') {
      return next;
    }
    const name = normalizeName(next.itemName);
    const matched = updatedLines.find(
      (l) => normalizeName(sourceItems[l.itemIndex]?.itemName) === name
    );
    if (matched) {
      next.sourceItemIndex = matched.itemIndex;
    }
    return next;
  });

  body.orderFromPoNumber = resolvedPoNumber;
  body.orderFromQuoteLines = updatedLines;
  return body;
}

module.exports = {
  syncInvoiceOrderFromSourceOnUpdate,
  rebuildOrderLinesFromItems,
};
