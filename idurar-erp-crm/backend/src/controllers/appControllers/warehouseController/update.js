const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemName,
      description,
      sku,
      quantity,
      warehouse,
      unitPrice,
      supplier,
      project,
      status,
      minStockLevel,
      location,
      notes
    } = req.body;

    // 查找現有記錄
    const existingInventory = await WarehouseInventory.findById(id);
    if (!existingInventory || existingInventory.removed) {
      return res.status(404).json({
        success: false,
        message: '存倉記錄不存在'
      });
    }

    // 檢查SKU是否與其他記錄衝突
    if (sku && sku !== existingInventory.sku) {
      const duplicateSku = await WarehouseInventory.findOne({ 
        sku: sku, 
        removed: false,
        _id: { $ne: id }
      });
      if (duplicateSku) {
        return res.status(400).json({
          success: false,
          message: 'SKU已存在，請使用不同的SKU'
        });
      }
    }

    // 記錄數量變動
    const oldQuantity = existingInventory.quantity;
    const newQuantity = quantity ? parseInt(quantity) : oldQuantity;
    const quantityChange = newQuantity - oldQuantity;

    // 更新記錄
    const updateData = {
      updatedBy: req.admin._id,
      lastUpdated: new Date()
    };

    if (itemName !== undefined) updateData.itemName = itemName;
    if (description !== undefined) updateData.description = description;
    if (sku !== undefined) updateData.sku = sku;
    if (quantity !== undefined) updateData.quantity = newQuantity;
    if (warehouse !== undefined) updateData.warehouse = warehouse;
    if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice) || 0;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (project !== undefined) updateData.project = project;
    if (status !== undefined) updateData.status = status;
    if (minStockLevel !== undefined) updateData.minStockLevel = parseInt(minStockLevel) || 0;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const updatedInventory = await WarehouseInventory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // 如果有數量變動，建立交易記錄
    if (quantityChange !== 0) {
      const transactionType = quantityChange > 0 ? 'inbound' : 'outbound';
      const transaction = new WarehouseTransaction({
        warehouseInventory: id,
        transactionType: transactionType,
        quantityChange: quantityChange,
        quantityBefore: oldQuantity,
        quantityAfter: newQuantity,
        unitPrice: parseFloat(unitPrice) || existingInventory.unitPrice,
        totalValue: Math.abs(quantityChange) * (parseFloat(unitPrice) || existingInventory.unitPrice),
        project: project || existingInventory.project,
        reason: '庫存調整',
        notes: `數量從 ${oldQuantity} 調整為 ${newQuantity}`,
        createdBy: req.admin._id
      });
      await transaction.save();
    }

    // 重新查詢包含關聯數據的記錄
    const populatedInventory = await WarehouseInventory.findById(id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .lean();

    res.status(200).json({
      success: true,
      message: '存倉記錄更新成功',
      result: populatedInventory
    });

  } catch (error) {
    console.error('Error in warehouse inventory update:', error);
    res.status(500).json({
      success: false,
      message: '更新存倉記錄失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(update);
