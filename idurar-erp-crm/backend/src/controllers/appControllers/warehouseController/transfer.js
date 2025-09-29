const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

const transfer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      toWarehouse,
      quantity,
      reason,
      notes
    } = req.body;

    // 驗證必填欄位
    if (!toWarehouse || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: '目標倉庫和轉移數量為必填欄位'
      });
    }

    // 查找源存倉記錄
    const sourceInventory = await WarehouseInventory.findById(id);
    if (!sourceInventory || sourceInventory.removed) {
      return res.status(404).json({
        success: false,
        message: '源存倉記錄不存在'
      });
    }

    // 檢查庫存是否足夠
    if (sourceInventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: '庫存不足，無法轉移'
      });
    }

    // 檢查目標倉庫是否與源倉庫相同
    if (sourceInventory.warehouse === toWarehouse) {
      return res.status(400).json({
        success: false,
        message: '目標倉庫不能與源倉庫相同'
      });
    }

    // 查找目標倉庫的相同貨品記錄
    let targetInventory = await WarehouseInventory.findOne({
      itemName: sourceInventory.itemName,
      sku: sourceInventory.sku,
      warehouse: toWarehouse,
      removed: false
    });

    // 更新源倉庫庫存
    const sourceOldQuantity = sourceInventory.quantity;
    sourceInventory.quantity -= quantity;
    sourceInventory.updatedBy = req.admin._id;
    sourceInventory.lastUpdated = new Date();
    await sourceInventory.save();

    // 建立源倉庫出庫交易記錄
    const sourceTransaction = new WarehouseTransaction({
      warehouseInventory: id,
      transactionType: 'outbound',
      quantityChange: -quantity,
      quantityBefore: sourceOldQuantity,
      quantityAfter: sourceInventory.quantity,
      unitPrice: sourceInventory.unitPrice,
      totalValue: quantity * sourceInventory.unitPrice,
      fromWarehouse: sourceInventory.warehouse,
      toWarehouse: toWarehouse,
      project: sourceInventory.project,
      reason: reason || '倉庫轉移',
      notes: notes || `轉移到倉${toWarehouse}`,
      createdBy: req.admin._id
    });
    await sourceTransaction.save();

    // 處理目標倉庫
    if (targetInventory) {
      // 更新現有記錄
      const targetOldQuantity = targetInventory.quantity;
      targetInventory.quantity += quantity;
      targetInventory.updatedBy = req.admin._id;
      targetInventory.lastUpdated = new Date();
      await targetInventory.save();

      // 建立目標倉庫入庫交易記錄
      const targetTransaction = new WarehouseTransaction({
        warehouseInventory: targetInventory._id,
        transactionType: 'inbound',
        quantityChange: quantity,
        quantityBefore: targetOldQuantity,
        quantityAfter: targetInventory.quantity,
        unitPrice: sourceInventory.unitPrice,
        totalValue: quantity * sourceInventory.unitPrice,
        fromWarehouse: sourceInventory.warehouse,
        toWarehouse: toWarehouse,
        project: sourceInventory.project,
        reason: reason || '倉庫轉移',
        notes: notes || `從倉${sourceInventory.warehouse}轉移`,
        createdBy: req.admin._id
      });
      await targetTransaction.save();
    } else {
      // 建立新的目標倉庫記錄
      targetInventory = new WarehouseInventory({
        itemName: sourceInventory.itemName,
        description: sourceInventory.description,
        sku: sourceInventory.sku,
        quantity: quantity,
        warehouse: toWarehouse,
        unitPrice: sourceInventory.unitPrice,
        supplier: sourceInventory.supplier,
        project: sourceInventory.project,
        status: sourceInventory.status,
        minStockLevel: sourceInventory.minStockLevel,
        location: sourceInventory.location,
        notes: sourceInventory.notes,
        createdBy: req.admin._id
      });
      await targetInventory.save();

      // 建立目標倉庫入庫交易記錄
      const targetTransaction = new WarehouseTransaction({
        warehouseInventory: targetInventory._id,
        transactionType: 'inbound',
        quantityChange: quantity,
        quantityBefore: 0,
        quantityAfter: quantity,
        unitPrice: sourceInventory.unitPrice,
        totalValue: quantity * sourceInventory.unitPrice,
        fromWarehouse: sourceInventory.warehouse,
        toWarehouse: toWarehouse,
        project: sourceInventory.project,
        reason: reason || '倉庫轉移',
        notes: notes || `從倉${sourceInventory.warehouse}轉移`,
        createdBy: req.admin._id
      });
      await targetTransaction.save();
    }

    // 重新查詢更新後的記錄
    const updatedSourceInventory = await WarehouseInventory.findById(id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .lean();

    const updatedTargetInventory = await WarehouseInventory.findById(targetInventory._id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .lean();

    res.status(200).json({
      success: true,
      message: '倉庫轉移成功',
      result: {
        source: updatedSourceInventory,
        target: updatedTargetInventory,
        transferredQuantity: quantity
      }
    });

  } catch (error) {
    console.error('Error in warehouse inventory transfer:', error);
    res.status(500).json({
      success: false,
      message: '倉庫轉移失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(transfer);
