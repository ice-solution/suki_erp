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

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * 由 S 單 items 重建 orderFromQuoteLines。
 * 優先用 item.sourceItemIndex；舊資料則以來源 itemName 對回舊 lines。
 * 刪除的來源行不會再出現 → 餘額自動退回。
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
        // 手動新增、無法對回來源的明細：不佔用上單餘額
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
 * S 單更新 items（含刪除）時，同步 orderFromQuoteLines（僅當仍關聯報價單或吊船報價）。
 * 例：報價 10 件、本單原上單 6 → 刪除該行或改為 0 時，報價「已上單」應退回、餘額補回。
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
      throw new Error(`此 S 單的來源行不屬於 P.O number：${resolvedPoNumber}`);
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

  const orderedMapAll = isFromQuote
    ? await aggregateOrderedQtyByQuoteLine(sourceDoc._id, resolvedPoNumber)
    : await aggregateOrderedQtyByShipQuoteLine(sourceDoc._id, resolvedPoNumber);

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
  syncSupplierQuoteOrderFromSourceOnUpdate,
  rebuildOrderLinesFromItems,
};
