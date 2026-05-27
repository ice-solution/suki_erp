const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const { catchErrors } = require('../../../handlers/errorHandlers');

/**
 * GET /warehouse/transfer/sku-check?sku=&toWarehouse=&excludeId=
 * 轉倉前檢查目標貨品編號：已存在則可併入數量，否則將建立新貨品
 */
const transferSkuCheck = async (req, res) => {
  const skuTrimmed = req.query.sku != null ? String(req.query.sku).trim() : '';
  const toWarehouseCode = req.query.toWarehouse != null ? String(req.query.toWarehouse).trim() : '';
  const excludeId = req.query.excludeId;

  if (!skuTrimmed) {
    return res.status(400).json({
      success: false,
      message: '請提供貨品編號',
    });
  }

  if (!toWarehouseCode) {
    return res.status(400).json({
      success: false,
      message: '請選擇目標倉庫',
    });
  }

  const existing = await WarehouseInventory.findOne({
    sku: skuTrimmed,
    removed: false,
  }).lean();

  if (existing && excludeId && String(existing._id) === String(excludeId)) {
    return res.status(400).json({
      success: false,
      message: '目標貨品編號不可與源貨品編號相同',
    });
  }

  if (existing) {
    const sameWarehouse = existing.warehouse === toWarehouseCode;
    return res.status(200).json({
      success: true,
      result: {
        exists: true,
        willMerge: sameWarehouse,
        willCreate: false,
        sameWarehouse,
        existingWarehouse: existing.warehouse,
        itemName: existing.itemName,
        currentQuantity: existing.quantity,
        inventoryId: existing._id,
        message: sameWarehouse
          ? `貨品編號「${skuTrimmed}」已存在於目標倉庫，轉倉後數量將併入該筆記錄（目前 ${existing.quantity}）`
          : `貨品編號「${skuTrimmed}」已存在於倉庫 ${existing.warehouse}，請改選該倉庫或輸入其他編號`,
      },
    });
  }

  return res.status(200).json({
    success: true,
    result: {
      exists: false,
      willMerge: false,
      willCreate: true,
      message: `貨品編號「${skuTrimmed}」尚不存在，轉倉後將於目標倉庫建立新貨品`,
    },
  });
};

module.exports = catchErrors(transferSkuCheck);
