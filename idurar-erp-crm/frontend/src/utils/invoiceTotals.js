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

/** 四捨五入至小數點後 2 位（僅用於整個佔比% 顯示／其他需要入數嘅場合） */
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

export function resolveWholeProjectPercentage(invoice, projectTotal) {
  if (invoice?.wholeProjectPercentage != null && invoice.wholeProjectPercentage !== '') {
    const stored = roundHalfUp2(Number(invoice.wholeProjectPercentage));
    if (stored != null) return stored;
  }
  return computeInvoiceProjectPercentage(Number(invoice?.total) || 0, projectTotal);
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

/**
 * 發票總計：先依專案佔比得出本單金額，再套用折扣。
 * 佔比後不四捨五入。
 */
export function computeInvoiceTotals({ subTotal, discount = 0, projectPercentage = 100 }) {
  const pct = safeProjectPct(projectPercentage);
  const disc = safeDiscountPct(discount);
  const base = Number(subTotal) || 0;
  const splitSubTotal = (base * pct) / 100;
  const discountTotal = (splitSubTotal * disc) / 100;
  const total = splitSubTotal - discountTotal;
  return { splitSubTotal, discountTotal, total };
}
