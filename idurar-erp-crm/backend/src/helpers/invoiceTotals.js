const { calculate } = require('@/helpers');

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
 * 例：小計 300,700 × 60% = 180,420；折扣 2% = 3,608.40；總計 176,811.60
 */
function computeInvoiceTotals({ subTotal, discount = 0, projectPercentage = 100 }) {
  const pct = safeProjectPct(projectPercentage);
  const disc = safeDiscountPct(discount);
  const splitSubTotal = calculate.multiply(subTotal, pct / 100);
  const discountTotal = calculate.multiply(splitSubTotal, disc / 100);
  const total = calculate.sub(splitSubTotal, discountTotal);
  return { splitSubTotal, discountTotal, total };
}

module.exports = {
  safeProjectPct,
  safeDiscountPct,
  computeInvoiceTotals,
};
