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

/** 四捨五入至小數點後 2 位 */
export function roundHalfUp2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 發票整個佔比 % = 發票總額 ÷ 專案總額 × 100 */
export function computeInvoiceProjectPercentage(invoiceTotal, projectTotal) {
  const inv = Number(invoiceTotal);
  const proj = Number(projectTotal);
  if (!Number.isFinite(inv) || !Number.isFinite(proj) || proj <= 0) return null;
  return roundHalfUp2((inv / proj) * 100);
}

export function resolveProjectTotalAmount(project) {
  if (project) {
    const projectPrice = Number(project.projectPrice);
    if (Number.isFinite(projectPrice) && projectPrice > 0) return projectPrice;
    const costPrice = Number(project.costPrice);
    if (Number.isFinite(costPrice) && costPrice > 0) return costPrice;
  }
  return 0;
}

/** 發票總計：先依專案佔比得出本單金額，再套用折扣 */
export function computeInvoiceTotals({ subTotal, discount = 0, projectPercentage = 100 }) {
  const pct = safeProjectPct(projectPercentage);
  const disc = safeDiscountPct(discount);
  const splitSubTotal = calculate.multiply(subTotal, pct / 100);
  const discountTotal = calculate.multiply(splitSubTotal, disc / 100);
  const total = calculate.sub(splitSubTotal, discountTotal);
  return { splitSubTotal, discountTotal, total };
}
