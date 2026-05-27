const mongoose = require('mongoose');
const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

/** 轉倉失敗時還原已變更的庫存與已寫入的交易 */
async function rollbackTransfer({
  sourceId,
  sourceOldQuantity,
  sourceTransactionId,
  targetInventoryId,
  targetOldQuantity,
  targetWasNew,
  targetTransactionId,
}) {
  if (targetTransactionId) {
    await WarehouseTransaction.deleteOne({ _id: targetTransactionId });
  }
  if (targetInventoryId && targetWasNew) {
    await WarehouseTransaction.deleteMany({ warehouseInventory: targetInventoryId });
    await WarehouseInventory.deleteOne({ _id: targetInventoryId });
  } else if (targetInventoryId != null && targetOldQuantity != null) {
    await WarehouseInventory.updateOne(
      { _id: targetInventoryId },
      { $set: { quantity: targetOldQuantity, lastUpdated: new Date() } }
    );
  }
  if (sourceTransactionId) {
    await WarehouseTransaction.deleteOne({ _id: sourceTransactionId });
  }
  if (sourceId != null && sourceOldQuantity != null) {
    await WarehouseInventory.updateOne(
      { _id: sourceId },
      { $set: { quantity: sourceOldQuantity, lastUpdated: new Date() } }
    );
  }
}

const transfer = async (req, res) => {
  let sourceOldQuantity = null;
  let sourceTransactionId = null;
  let targetInventoryId = null;
  let targetOldQuantity = null;
  let targetWasNew = false;
  let targetTransactionId = null;
  let sourceAdjusted = false;

  try {
    const { id } = req.params;
    const { toWarehouse, quantity, targetSku, reason, notes } = req.body;

    const parsedQty = parseInt(quantity, 10);
    const skuTrimmed = targetSku != null ? String(targetSku).trim() : '';
    const toWarehouseCode = toWarehouse != null ? String(toWarehouse).trim() : '';

    if (!toWarehouseCode || !parsedQty || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: '目標倉庫和轉移數量為必填欄位',
      });
    }

    if (!skuTrimmed) {
      return res.status(400).json({
        success: false,
        message: '請輸入目標倉庫的貨品編號',
      });
    }

    const sourceInventory = await WarehouseInventory.findById(id);
    if (!sourceInventory || sourceInventory.removed) {
      return res.status(404).json({
        success: false,
        message: '源存倉記錄不存在',
      });
    }

    if (skuTrimmed === sourceInventory.sku) {
      return res.status(400).json({
        success: false,
        message: '目標貨品編號不可與源貨品編號相同（貨品編號全系統唯一）',
      });
    }

    if (sourceInventory.quantity < parsedQty) {
      return res.status(400).json({
        success: false,
        message: '庫存不足，無法轉移',
      });
    }

    if (sourceInventory.warehouse === toWarehouseCode) {
      return res.status(400).json({
        success: false,
        message: '目標倉庫不能與源倉庫相同',
      });
    }

    const existingBySku = await WarehouseInventory.findOne({
      sku: skuTrimmed,
      removed: false,
    });

    let targetInventory = null;
    let transferAction = 'created';

    if (existingBySku && String(existingBySku._id) !== String(sourceInventory._id)) {
      if (existingBySku.warehouse !== toWarehouseCode) {
        return res.status(400).json({
          success: false,
          message: `貨品編號「${skuTrimmed}」已存在於倉庫 ${existingBySku.warehouse}，請選擇該倉庫作為目標倉，或改用其他貨品編號`,
        });
      }
      targetInventory = existingBySku;
      transferAction = 'merged';
    }

    targetWasNew = !targetInventory;

    sourceOldQuantity = sourceInventory.quantity;
    const sourceAfterQty = sourceOldQuantity - parsedQty;

    // 先驗證交易紀錄 schema（避免扣庫存後才因 enum 等失敗）
    const sourceTransactionDoc = new WarehouseTransaction({
      warehouseInventory: id,
      transactionType: 'outbound',
      quantityChange: -parsedQty,
      quantityBefore: sourceOldQuantity,
      quantityAfter: sourceAfterQty,
      unitPrice: sourceInventory.unitPrice,
      totalValue: parsedQty * sourceInventory.unitPrice,
      fromWarehouse: sourceInventory.warehouse,
      toWarehouse: toWarehouseCode,
      project: sourceInventory.project,
      reason: reason || '倉庫轉移',
      notes: notes || `轉移至倉${toWarehouseCode}（貨品編號 ${skuTrimmed}）`,
      createdBy: req.admin._id,
    });
    await sourceTransactionDoc.validate();

    targetOldQuantity = targetInventory ? targetInventory.quantity : 0;
    const targetAfterQty = targetOldQuantity + parsedQty;
    const targetInvRef = targetInventory ? targetInventory._id : new mongoose.Types.ObjectId();

    const targetTransactionDoc = new WarehouseTransaction({
      warehouseInventory: targetInvRef,
      transactionType: 'inbound',
      quantityChange: parsedQty,
      quantityBefore: targetOldQuantity,
      quantityAfter: targetAfterQty,
      unitPrice: sourceInventory.unitPrice,
      totalValue: parsedQty * sourceInventory.unitPrice,
      fromWarehouse: sourceInventory.warehouse,
      toWarehouse: toWarehouseCode,
      project: sourceInventory.project,
      reason: reason || '倉庫轉移',
      notes: notes || `從倉${sourceInventory.warehouse}轉移（源編號 ${sourceInventory.sku}）`,
      createdBy: req.admin._id,
    });
    await targetTransactionDoc.validate();

    if (targetWasNew) {
      const draftTarget = new WarehouseInventory({
        _id: targetInvRef,
        itemName: sourceInventory.itemName,
        description: sourceInventory.description,
        sku: skuTrimmed,
        category: sourceInventory.category,
        quantity: parsedQty,
        weight: sourceInventory.weight,
        warehouse: toWarehouseCode,
        unitPrice: sourceInventory.unitPrice,
        supplier: sourceInventory.supplier,
        project: sourceInventory.project,
        status: 'available',
        minStockLevel: sourceInventory.minStockLevel,
        location: sourceInventory.location,
        notes: sourceInventory.notes,
        createdBy: req.admin._id,
      });
      await draftTarget.validate();
    }

    // —— 以下寫入；任一步失敗則 rollback ——
    sourceInventory.quantity = sourceAfterQty;
    sourceInventory.updatedBy = req.admin._id;
    sourceInventory.lastUpdated = new Date();
    await sourceInventory.save();
    sourceAdjusted = true;

    await sourceTransactionDoc.save();
    sourceTransactionId = sourceTransactionDoc._id;

    if (targetInventory) {
      targetInventory.quantity = targetAfterQty;
      targetInventory.updatedBy = req.admin._id;
      targetInventory.lastUpdated = new Date();
      await targetInventory.save();
      targetInventoryId = targetInventory._id;
    } else {
      targetInventory = new WarehouseInventory({
        _id: targetInvRef,
        itemName: sourceInventory.itemName,
        description: sourceInventory.description,
        sku: skuTrimmed,
        category: sourceInventory.category,
        quantity: parsedQty,
        weight: sourceInventory.weight,
        warehouse: toWarehouseCode,
        unitPrice: sourceInventory.unitPrice,
        supplier: sourceInventory.supplier,
        project: sourceInventory.project,
        status: 'available',
        minStockLevel: sourceInventory.minStockLevel,
        location: sourceInventory.location,
        notes: sourceInventory.notes,
        createdBy: req.admin._id,
      });
      await targetInventory.save();
      targetInventoryId = targetInventory._id;
    }

    targetTransactionDoc.warehouseInventory = targetInventoryId;
    await targetTransactionDoc.save();
    targetTransactionId = targetTransactionDoc._id;

    const updatedSourceInventory = await WarehouseInventory.findById(id)
      .populate('supplier', 'name')
      .populate('project', 'name invoiceNumber')
      .lean();

    const updatedTargetInventory = await WarehouseInventory.findById(targetInventoryId)
      .populate('supplier', 'name')
      .populate('project', 'name invoiceNumber')
      .lean();

    const successMessage =
      transferAction === 'merged'
        ? `轉倉成功：數量已併入現有貨品「${skuTrimmed}」`
        : `轉倉成功：已於目標倉庫建立新貨品「${skuTrimmed}」`;

    res.status(200).json({
      success: true,
      message: successMessage,
      result: {
        source: updatedSourceInventory,
        target: updatedTargetInventory,
        transferredQuantity: parsedQty,
        targetSku: skuTrimmed,
        action: transferAction,
      },
    });
  } catch (error) {
    console.error('Error in warehouse inventory transfer:', error);

    if (sourceAdjusted) {
      try {
        await rollbackTransfer({
          sourceId: req.params.id,
          sourceOldQuantity,
          sourceTransactionId,
          targetInventoryId,
          targetOldQuantity: targetWasNew ? null : targetOldQuantity,
          targetWasNew,
          targetTransactionId,
        });
      } catch (rollbackErr) {
        console.error('Transfer rollback failed:', rollbackErr);
      }
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '貨品編號已存在，請使用其他編號',
      });
    }

    const isValidation =
      error.name === 'ValidationError' ||
      (error.message && error.message.includes('validation failed'));

    res.status(isValidation ? 400 : 500).json({
      success: false,
      message: isValidation
        ? error.message || '轉倉資料驗證失敗，已還原源倉庫存'
        : '倉庫轉移失敗，已還原源倉庫存',
      error: error.message,
    });
  }
};

module.exports = catchErrors(transfer);
