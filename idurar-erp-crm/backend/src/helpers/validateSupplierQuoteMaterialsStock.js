const mongoose = require('mongoose');
const WarehouseInventory = mongoose.model('WarehouseInventory');
const { computeMaterialDeltas } = require('./supplierQuoteMaterialsWarehouseSync');

async function findInventoryForDelta({ warehouseInventoryId, warehouse, itemName }) {
  const idStr =
    warehouseInventoryId != null && warehouseInventoryId !== ''
      ? String(warehouseInventoryId).trim()
      : '';
  if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
    const inv = await WarehouseInventory.findOne({ _id: idStr, removed: false }).lean();
    if (inv) return inv;
  }
  if (warehouse && itemName) {
    return WarehouseInventory.findOne({
      removed: false,
      warehouse: String(warehouse).trim(),
      itemName: String(itemName).trim(),
    }).lean();
  }
  return null;
}

/**
 * 驗證 S 單材料出庫量不超過可用庫存（狀態須為 available）。
 * @throws {Error}
 */
async function assertSupplierQuoteMaterialsStock({ oldMaterials, newMaterials }) {
  const deltas = computeMaterialDeltas(oldMaterials, newMaterials);

  for (const { warehouseInventoryId, warehouse, itemName, materialDelta } of deltas) {
    if (materialDelta <= 0) continue;

    const inv = await findInventoryForDelta({
      warehouseInventoryId,
      warehouse,
      itemName,
    });

    const label = inv
      ? `「${inv.warehouse}」${inv.itemName}${inv.sku ? `（${inv.sku}）` : ''}`
      : `「${warehouse}」${itemName || warehouseInventoryId || ''}`;

    if (!inv) {
      throw new Error(`${label} 不存在於存倉，無法出庫`);
    }
    if (inv.status !== 'available' || Number(inv.quantity) <= 0) {
      throw new Error(`${label} 非可用狀態或無庫存，無法選用`);
    }
    if (Number(inv.quantity) < materialDelta) {
      throw new Error(
        `${label} 庫存不足（現有 ${inv.quantity}，需要 ${materialDelta}）`
      );
    }
  }
}

module.exports = {
  assertSupplierQuoteMaterialsStock,
};
