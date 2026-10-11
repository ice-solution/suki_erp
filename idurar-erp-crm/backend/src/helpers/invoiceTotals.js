function safeProjectPct(raw) {
  if (raw == null || raw === '') return 100;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(0, n));
}

function safeDiscountPct(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * 發票總計：行金額加總（小計）再套用折扣。
 * 整個佔比% 只作顯示，不再乘入總額（佔比已反映在行單價／金額）。
 * projectPercentage 保留參數以免舊呼叫端報錯，計算時忽略。
 */
function computeInvoiceTotals({ subTotal, discount = 0 }) {
  const disc = safeDiscountPct(discount);
  const base = Number(subTotal) || 0;
  const splitSubTotal = base;
  const discountTotal = (splitSubTotal * disc) / 100;
  const total = splitSubTotal - discountTotal;
  return { splitSubTotal, discountTotal, total };
}

module.exports = {
  safeProjectPct,
  safeDiscountPct,
  computeInvoiceTotals,
};
