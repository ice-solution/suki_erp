function normalizeQty(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? v : 0;
}

function linePoNumber(item, headerPo) {
  return String(item.poNumber || '').trim() || headerPo;
}

/**
 * 解析上單／轉發票用的行與數量（POST lines 或 GET 一次上滿餘額）。
 * @returns {{ ok: true, lines: { itemIndex: number, quantity: number }[] } | { ok: false, status: number, message: string }}
 */
function resolvePoConversionLines({
  items,
  headerPo,
  poNumber,
  qtyByLineMap,
  rawLines,
  isPost,
}) {
  const pn = String(poNumber || '').trim();
  const list = items || [];
  const resolvedLines = [];

  if (isPost) {
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return {
        ok: false,
        status: 400,
        message: '請提供 lines：[{ itemIndex, quantity }]',
      };
    }
    for (const row of rawLines) {
      const itemIndex = normalizeQty(row?.itemIndex);
      const qty = normalizeQty(row?.quantity);
      if (qty <= 0) continue;
      const item = list[itemIndex];
      if (!item || linePoNumber(item, headerPo) !== pn) {
        return {
          ok: false,
          status: 400,
          message: `無效的 itemIndex：${itemIndex}`,
        };
      }
      const totalQty = Math.max(0, normalizeQty(item.quantity));
      const already = Math.max(0, normalizeQty(qtyByLineMap[itemIndex] || 0));
      const remaining = Math.max(0, totalQty - already);
      if (qty > remaining) {
        return {
          ok: false,
          status: 400,
          message: `第 ${itemIndex + 1} 行數量 ${qty} 超過餘額 ${remaining}`,
        };
      }
      resolvedLines.push({ itemIndex, quantity: qty });
    }
  } else {
    for (let itemIndex = 0; itemIndex < list.length; itemIndex++) {
      const item = list[itemIndex];
      if (linePoNumber(item, headerPo) !== pn) continue;
      const totalQty = Math.max(0, normalizeQty(item.quantity));
      const already = Math.max(0, normalizeQty(qtyByLineMap[itemIndex] || 0));
      const remaining = Math.max(0, totalQty - already);
      if (remaining > 0) {
        resolvedLines.push({ itemIndex, quantity: remaining });
      }
    }
  }

  if (resolvedLines.length === 0) {
    return {
      ok: false,
      status: 400,
      message: isPost
        ? '請至少選擇一行且數量大於 0，且不可超過餘額'
        : `此 P.O 已無可轉換餘額或沒有符合的項目：${pn}`,
    };
  }

  return { ok: true, lines: resolvedLines };
}

function normalizePct(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * B 模式：解析逐項專案佔比 lines（POST）。
 * @returns {{ ok: true, lines: { itemIndex: number, percentage: number }[] } | { ok: false, status: number, message: string }}
 */
function resolvePoPercentageLines({ items, headerPo, poNumber, pctByLineMap, rawLines, isPost }) {
  const pn = String(poNumber || '').trim();
  const list = items || [];
  const resolvedLines = [];

  if (!isPost) {
    return {
      ok: false,
      status: 400,
      message: 'B 模式須提供 lines：[{ itemIndex, percentage }]',
    };
  }

  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return {
      ok: false,
      status: 400,
      message: '請提供 lines：[{ itemIndex, percentage }]',
    };
  }

  for (const row of rawLines) {
    const itemIndex = normalizeQty(row?.itemIndex);
    const pct = normalizePct(row?.percentage);
    if (pct <= 0) continue;
    const item = list[itemIndex];
    if (!item || linePoNumber(item, headerPo) !== pn) {
      return {
        ok: false,
        status: 400,
        message: `無效的 itemIndex：${itemIndex}`,
      };
    }
    const already = Math.max(0, normalizePct(pctByLineMap[itemIndex] || 0));
    const remaining = Math.max(0, 100 - already);
    if (pct > remaining + 0.0001) {
      return {
        ok: false,
        status: 400,
        message: `第 ${itemIndex + 1} 行專案佔比 ${pct}% 超過餘額 ${remaining}%`,
      };
    }
    resolvedLines.push({ itemIndex, percentage: pct });
  }

  if (resolvedLines.length === 0) {
    return {
      ok: false,
      status: 400,
      message: '請至少一行填寫大於 0 的專案佔比 (%)',
    };
  }

  return { ok: true, lines: resolvedLines };
}

module.exports = {
  normalizeQty,
  linePoNumber,
  resolvePoConversionLines,
  resolvePoPercentageLines,
};
