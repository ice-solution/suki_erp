const mongoose = require('mongoose');

const WarehouseInventory = mongoose.model('WarehouseInventory');
const WarehouseTransaction = mongoose.model('WarehouseTransaction');

const WAREHOUSE_KEYS = ['A', 'B', 'C', 'D'];

function normalizeInventoryId(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw._id) return String(raw._id).trim();
  return String(raw).trim();
}

/**
 * 可扣倉的材料列：倉 A–D、有數量；排除「其他」及加工費等非實物項。
 * 優先使用 warehouseInventory（ObjectId）彙總；舊資料無 id 時仍用 倉+貨品名稱。
 */
function parseStockableLine(m) {
  if (!m || typeof m !== 'object') return null;
  const wh = m.warehouse;
  if (!wh || !WAREHOUSE_KEYS.includes(String(wh).trim())) return null;
  if (m.accountingType === 'processing_fee') return null;

  const idStr = normalizeInventoryId(m.warehouseInventory);
  const hasValidId = mongoose.Types.ObjectId.isValid(idStr);

  const itemName = m.itemName != null ? String(m.itemName).trim() : '';
  if (!hasValidId && !itemName) return null;

  const qty = Number(m.quantity);
  if (!Number.isFinite(qty) || qty === 0) return null;

  return {
    warehouse: String(wh).trim(),
    itemName,
    quantity: qty,
    warehouseInventoryId: hasValidId ? idStr : null,
  };
}

/** 依「存倉貨品 id」或「倉+貨品名稱（舊）」加總數量 */
function aggregateMaterials(materials) {
  const map = new Map();
  for (const m of materials || []) {
    const p = parseStockableLine(m);
    if (!p) continue;
    const key = p.warehouseInventoryId
      ? `id:${p.warehouseInventoryId}`
      : `legacy:${p.warehouse}\t${p.itemName}`;
    const prev = map.get(key);
    if (prev) {
      prev.quantity += p.quantity;
    } else {
      map.set(key, {
        warehouse: p.warehouse,
        itemName: p.itemName,
        quantity: p.quantity,
        warehouseInventoryId: p.warehouseInventoryId,
      });
    }
  }
  return map;
}

/**
 * 回傳 { warehouseInventoryId, warehouse, itemName, materialDelta }，
 * materialDelta = 新合計 − 舊合計（>0 表示 S 單多用，需從倉扣）
 */
function computeMaterialDeltas(oldMaterials, newMaterials) {
  const oldMap = aggregateMaterials(oldMaterials);
  const newMap = aggregateMaterials(newMaterials);
  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const deltas = [];
  for (const k of keys) {
    const oldQ = oldMap.get(k)?.quantity || 0;
    const newQ = newMap.get(k)?.quantity || 0;
    const materialDelta = newQ - oldQ;
    if (materialDelta === 0) continue;
    const meta = newMap.get(k) || oldMap.get(k);
    deltas.push({
      warehouseInventoryId: meta.warehouseInventoryId,
      warehouse: meta.warehouse,
      itemName: meta.itemName,
      materialDelta,
    });
  }
  return deltas;
}

/**
 * 庫存變動 = -materialDelta（S 單增加用量 → 倉庫減少）
 */
async function applyOneStockChange({
  warehouseInventoryId,
  warehouse,
  itemName,
  stockChange,
  supplierQuoteId,
  adminId,
}) {
  if (stockChange === 0) return;

  if (!adminId) {
    throw new Error('缺少操作者資訊，無法同步倉庫');
  }

  let inv = null;
  const idStr = normalizeInventoryId(warehouseInventoryId);
  if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
    inv = await WarehouseInventory.findOne({
      _id: idStr,
      removed: false,
    }).exec();
  }
  if (!inv && warehouse && itemName) {
    inv = await WarehouseInventory.findOne({
      removed: false,
      warehouse,
      itemName,
    }).exec();
  }

  const displayWh = inv ? inv.warehouse : warehouse;
  const displayName = inv ? inv.itemName : itemName;

  if (!inv) {
    if (stockChange < 0) {
      throw new Error(
        `倉庫「${displayWh}」找不到貨品「${displayName || itemName || idStr}」，無法扣減庫存`
      );
    }
    console.warn(
      `[supplierQuoteMaterialsWarehouseSync] 略過退倉：找不到庫存列（id=${idStr || '-'} 名稱=${itemName || '-'}）`
    );
    return;
  }

  const oldQuantity = inv.quantity;
  const newQuantity = oldQuantity + stockChange;
  if (newQuantity < 0) {
    throw new Error(
      `倉庫「${inv.warehouse}」貨品「${inv.itemName}」庫存不足（現有 ${oldQuantity}，需扣 ${-stockChange}）`
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
    for (const {
      warehouseInventoryId,
      warehouse,
      itemName,
      materialDelta,
    } of deltas) {
      const stockChange = -materialDelta;
      await applyOneStockChange({
        warehouseInventoryId,
        warehouse,
        itemName,
        stockChange,
        supplierQuoteId,
        adminId,
      });
      applied.push({
        warehouseInventoryId,
        warehouse,
        itemName,
        stockChange,
      });
    }
    return { applied };
  } catch (err) {
    for (const row of applied.slice().reverse()) {
      try {
        await applyOneStockChange({
          warehouseInventoryId: row.warehouseInventoryId,
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
      warehouseInventoryId: row.warehouseInventoryId,
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
