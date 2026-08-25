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
 * 發票總計：先依專案佔比得出本單金額，再套用折扣。
 * 佔比後不四捨五入（用原生浮點運算，避免 currency.js 預設 2 位入數）。
 */
function computeInvoiceTotals({ subTotal, discount = 0, projectPercentage = 100 }) {
  const pct = safeProjectPct(projectPercentage);
  const disc = safeDiscountPct(discount);
  const base = Number(subTotal) || 0;
  const splitSubTotal = (base * pct) / 100;
  const discountTotal = (splitSubTotal * disc) / 100;
  const total = splitSubTotal - discountTotal;
  return { splitSubTotal, discountTotal, total };
}

module.exports = {
  safeProjectPct,
  safeDiscountPct,
  computeInvoiceTotals,
};
