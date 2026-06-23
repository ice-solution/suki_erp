import { request } from '@/request';
import { isVirtualMaterialWarehouse } from '@/utils/supplierQuoteMaterialWarehouse';

const WAREHOUSE_KEYS = ['A', 'B', 'C', 'D'];

function normalizeInventoryId(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw._id) return String(raw._id).trim();
  return String(raw).trim();
}

function aggregateStockableMaterials(materials) {
  const map = new Map();
  for (const m of materials || []) {
    if (!m || typeof m !== 'object') continue;
    const wh = m.warehouse;
    if (!wh || !WAREHOUSE_KEYS.includes(String(wh).trim())) continue;
    if (m.accountingType === 'processing_fee') continue;

    const idStr = normalizeInventoryId(m.warehouseInventory);
    const itemName = m.itemName != null ? String(m.itemName).trim() : '';
    if (!idStr && !itemName) continue;

    const qty = Number(m.quantity);
    if (!Number.isFinite(qty) || qty === 0) continue;

    const key = idStr ? `id:${idStr}` : `legacy:${wh}\t${itemName}`;
    map.set(key, (map.get(key) || 0) + qty);
  }
  return map;
}

/** 僅回傳需從倉庫扣減的增量（materialDelta > 0） */
export function computeOutboundMaterialDeltas(oldMaterials, newMaterials) {
  const oldMap = aggregateStockableMaterials(oldMaterials);
  const newMap = aggregateStockableMaterials(newMaterials);
  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const deltas = [];

  for (const k of keys) {
    const materialDelta = (newMap.get(k) || 0) - (oldMap.get(k) || 0);
    if (materialDelta <= 0) continue;

    if (k.startsWith('id:')) {
      deltas.push({
        warehouseInventoryId: k.slice(3),
        warehouse: null,
        itemName: null,
        outboundQty: materialDelta,
      });
    } else {
      const [warehouse, itemName] = k.slice(7).split('\t');
      deltas.push({
        warehouseInventoryId: null,
        warehouse,
        itemName,
        outboundQty: materialDelta,
      });
    }
  }
  return deltas;
}

export function isRealWarehouseMaterial(material) {
  if (!material?.warehouse) return false;
  if (isVirtualMaterialWarehouse(material.warehouse)) return false;
  return WAREHOUSE_KEYS.includes(String(material.warehouse).trim());
}

/**
 * 表單內單行：計算此存倉貨品尚可填寫的最大正數出庫量。
 */
export function getMaxOutboundQuantityForLine({
  warehouseInventoryId,
  materials,
  editingMaterialKey,
  originalMaterials = [],
  stockOnHand,
}) {
  const invId = normalizeInventoryId(warehouseInventoryId);
  if (!invId || stockOnHand == null) return null;

  const stock = Number(stockOnHand);
  if (!Number.isFinite(stock)) return null;

  let otherNet = 0;
  for (const m of materials || []) {
    const mKey = m.key || m._id;
    if (
      editingMaterialKey &&
      (mKey === editingMaterialKey || String(mKey) === String(editingMaterialKey))
    ) {
      continue;
    }
    if (normalizeInventoryId(m.warehouseInventory) !== invId) continue;
    const q = Number(m.quantity);
    if (Number.isFinite(q)) otherNet += q;
  }

  let oldLineQty = 0;
  if (editingMaterialKey) {
    const orig = (originalMaterials || []).find((m) => {
      const mKey = m.key || m._id;
      return (
        mKey === editingMaterialKey || String(mKey) === String(editingMaterialKey)
      );
    });
    if (orig && normalizeInventoryId(orig.warehouseInventory) === invId) {
      const q = Number(orig.quantity);
      if (Number.isFinite(q)) oldLineQty = q;
    }
  }

  const maxAllowed = stock + oldLineQty - otherNet;
  return maxAllowed > 0 ? maxAllowed : 0;
}

async function fetchInventoryRecord({ warehouseInventoryId, warehouse, itemName }) {
  const idStr = normalizeInventoryId(warehouseInventoryId);
  if (idStr) {
    const res = await request.get({ entity: `warehouse/${idStr}` });
    if (res?.success && res.result) return res.result;
  }
  if (warehouse && itemName) {
    const entity = `warehouse?warehouse=${encodeURIComponent(warehouse)}&stockAvailable=1&limit=50&search=${encodeURIComponent(itemName)}`;
    const res = await request.get({ entity });
    const rows = res?.result || [];
    return rows.find((r) => String(r.itemName).trim() === String(itemName).trim()) || null;
  }
  return null;
}

/**
 * 提交前驗證：庫存不足或非可用則回傳 { ok: false, message }。
 */
export async function validateSupplierQuoteMaterialsStock({
  materials,
  originalMaterials = [],
}) {
  const deltas = computeOutboundMaterialDeltas(originalMaterials, materials);
  if (deltas.length === 0) return { ok: true };

  for (const delta of deltas) {
    const inv = await fetchInventoryRecord(delta);
    const label = inv
      ? `${inv.itemName || ''}${inv.sku ? `（${inv.sku}）` : ''}`
      : delta.itemName || delta.warehouseInventoryId || '';

    if (!inv) {
      return { ok: false, message: `存倉貨品「${label}」不存在，無法出庫` };
    }
    if (inv.status !== 'available' || Number(inv.quantity) <= 0) {
      return {
        ok: false,
        message: `「${label}」非可用狀態或無庫存，請重新選擇`,
      };
    }
    if (Number(inv.quantity) < delta.outboundQty) {
      return {
        ok: false,
        message: `「${label}」庫存不足（現有 ${inv.quantity}，需要 ${delta.outboundQty}）`,
      };
    }
  }

  return { ok: true };
}
