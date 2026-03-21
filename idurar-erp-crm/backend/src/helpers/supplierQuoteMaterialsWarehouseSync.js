const mongoose = require('mongoose');

const WarehouseInventory = mongoose.model('WarehouseInventory');
const WarehouseTransaction = mongoose.model('WarehouseTransaction');

const WAREHOUSE_KEYS = ['A', 'B', 'C', 'D'];

/**
 * 可扣倉的材料列：倉 A–D、有名稱、有數量；排除「其他」及加工費等非實物項
 */
function parseStockableLine(m) {
  if (!m || typeof m !== 'object') return null;
  const wh = m.warehouse;
  if (!wh || !WAREHOUSE_KEYS.includes(String(wh).trim())) return null;
  if (m.accountingType === 'processing_fee') return null;
  const itemName = m.itemName != null ? String(m.itemName).trim() : '';
  if (!itemName) return null;
  const qty = Number(m.quantity);
  if (!Number.isFinite(qty) || qty === 0) return null;
  return {
    warehouse: String(wh).trim(),
    itemName,
    quantity: qty,
  };
}

/** 依倉庫+貨品名稱加總數量 */
function aggregateMaterials(materials) {
  const map = new Map();
  for (const m of materials || []) {
    const p = parseStockableLine(m);
    if (!p) continue;
    const key = `${p.warehouse}\t${p.itemName}`;
    map.set(key, (map.get(key) || 0) + p.quantity);
  }
  return map;
}

/**
 * 回傳 { warehouse, itemName, materialDelta }，materialDelta = 新合計 − 舊合計（>0 表示 S 單多用，需從倉扣）
 */
function computeMaterialDeltas(oldMaterials, newMaterials) {
  const oldMap = aggregateMaterials(oldMaterials);
  const newMap = aggregateMaterials(newMaterials);
  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const deltas = [];
  for (const k of keys) {
    const oldQ = oldMap.get(k) || 0;
    const newQ = newMap.get(k) || 0;
    const materialDelta = newQ - oldQ;
    if (materialDelta === 0) continue;
    const [warehouse, itemName] = k.split('\t');
    deltas.push({ warehouse, itemName, materialDelta });
  }
  return deltas;
}

/**
 * 庫存變動 = -materialDelta（S 單增加用量 → 倉庫減少）
 */
async function applyOneStockChange({ warehouse, itemName, stockChange, supplierQuoteId, adminId }) {
  if (stockChange === 0) return;

  if (!adminId) {
    throw new Error('缺少操作者資訊，無法同步倉庫');
  }

  const inv = await WarehouseInventory.findOne({
    removed: false,
    warehouse,
    itemName,
  }).exec();

  if (!inv) {
    if (stockChange < 0) {
      throw new Error(
        `倉庫「${warehouse}」找不到貨品「${itemName}」，無法扣減庫存`
      );
    }
    // 退倉但無庫存列：略過（避免誤建 SKU）
    console.warn(
      `[supplierQuoteMaterialsWarehouseSync] 略過退倉：倉 ${warehouse} 無「${itemName}」庫存列`
    );
    return;
  }

  const oldQuantity = inv.quantity;
  const newQuantity = oldQuantity + stockChange;
  if (newQuantity < 0) {
    throw new Error(
      `倉庫「${warehouse}」貨品「${itemName}」庫存不足（現有 ${oldQuantity}，需扣 ${-stockChange}）`
    );
  }

  inv.quantity = newQuantity;
  inv.updatedBy = adminId;
  inv.lastUpdated = new Date();
  await inv.save();

  const isOutbound = stockChange < 0;
  const transaction = new WarehouseTransaction({
    warehouseInventory: inv._id,
    transactionType: isOutbound ? 'outbound' : 'inbound',
    quantityChange: stockChange,
    quantityBefore: oldQuantity,
    quantityAfter: newQuantity,
    unitPrice: inv.unitPrice || 0,
    totalValue: Math.abs(stockChange) * (inv.unitPrice || 0),
    project: inv.project,
    supplierQuote: supplierQuoteId,
    reason: isOutbound ? 'S單材料出庫' : 'S單材料退回',
    notes: `SupplierQuote ${supplierQuoteId} 材料及費用管理同步`,
    createdBy: adminId,
  });
  await transaction.save();
}

/**
 * 依 S 單材料變更同步倉庫數量。失敗會 throw（請由呼叫端處理）。
 */
async function applySupplierQuoteMaterialsWarehouseSync({
  oldMaterials,
  newMaterials,
  supplierQuoteId,
  adminId,
}) {
  const deltas = computeMaterialDeltas(oldMaterials, newMaterials);
  if (deltas.length === 0) return { applied: [] };

  const applied = [];
  try {
    for (const { warehouse, itemName, materialDelta } of deltas) {
      const stockChange = -materialDelta;
      await applyOneStockChange({
        warehouse,
        itemName,
        stockChange,
        supplierQuoteId,
        adminId,
      });
      applied.push({ warehouse, itemName, stockChange });
    }
    return { applied };
  } catch (err) {
    for (const row of applied.slice().reverse()) {
      try {
        await applyOneStockChange({
          warehouse: row.warehouse,
          itemName: row.itemName,
          stockChange: -row.stockChange,
          supplierQuoteId,
          adminId,
        });
      } catch (revertErr) {
        console.error(
          '[supplierQuoteMaterialsWarehouseSync] 回滾庫存失敗:',
          revertErr
        );
      }
    }
    throw err;
  }
}

/** findOneAndUpdate 失敗時，將已成功套用的庫存變更倒回 */
async function revertAppliedSupplierQuoteStockChanges(applied, supplierQuoteId, adminId) {
  for (const row of (applied || []).slice().reverse()) {
    await applyOneStockChange({
      warehouse: row.warehouse,
      itemName: row.itemName,
      stockChange: -row.stockChange,
      supplierQuoteId,
      adminId,
    });
  }
}

module.exports = {
  aggregateMaterials,
  computeMaterialDeltas,
  applySupplierQuoteMaterialsWarehouseSync,
  revertAppliedSupplierQuoteStockChanges,
  parseStockableLine,
};
