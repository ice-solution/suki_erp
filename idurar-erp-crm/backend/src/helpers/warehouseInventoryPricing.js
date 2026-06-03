/** 金額四捨五入至小數點後 2 位 */
function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 總價值 = 數量 × 單價（皆四捨五入至 2 位） */
function computeTotalValue(quantity, unitPrice) {
  const qty = Math.max(0, Number(quantity) || 0);
  const price = Math.max(0, Number(unitPrice) || 0);
  return roundMoney(qty * price);
}

/**
 * 加權平均單價：入庫時依既有庫存與本次入庫數量、單價計算新平均單價。
 * 例：庫存 10 件 @150，入庫 5 件 @175 → (10×150 + 5×175) / 15
 */
function computeWeightedAverageUnitPrice(oldQty, oldUnitPrice, inboundQty, inboundUnitPrice) {
  const q0 = Math.max(0, Number(oldQty) || 0);
  const p0 = Math.max(0, Number(oldUnitPrice) || 0);
  const q1 = Math.max(0, Number(inboundQty) || 0);
  const p1 = Math.max(0, Number(inboundUnitPrice) || 0);

  if (q1 <= 0) return roundMoney(p0);
  if (q0 <= 0) return roundMoney(p1);
  return roundMoney((q0 * p0 + q1 * p1) / (q0 + q1));
}

module.exports = {
  roundMoney,
  computeTotalValue,
  computeWeightedAverageUnitPrice,
};
