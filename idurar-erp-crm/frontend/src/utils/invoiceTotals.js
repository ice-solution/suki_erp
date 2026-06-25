import calculate from '@/utils/calculate';

export function safeProjectPct(raw) {
  if (raw == null || raw === '') return 100;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(0, n));
}

export function safeDiscountPct(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** 先專案佔比、後折扣（與後端 invoiceTotals 一致） */
export function computeInvoiceTotals({ subTotal, discount = 0, projectPercentage = 100 }) {
  const pct = safeProjectPct(projectPercentage);
  const disc = safeDiscountPct(discount);
  const splitSubTotal = calculate.multiply(subTotal, pct / 100);
  const discountTotal = calculate.multiply(splitSubTotal, disc / 100);
  const total = calculate.sub(splitSubTotal, discountTotal);
  return { splitSubTotal, discountTotal, total };
}
