const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

const adjust = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quantityChange,
      reason,
      notes,
      transactionType = 'adjustment'
    } = req.body;

    // 驗證必填欄位
    if (quantityChange === undefined || quantityChange === 0) {
      return res.status(400).json({
        success: false,
        message: '數量變動不能為0'
      });
    }

    // 查找存倉記錄
    const inventory = await WarehouseInventory.findById(id);
    if (!inventory || inventory.removed) {
      return res.status(404).json({
        success: false,
        message: '存倉記錄不存在'
      });
    }

    // 計算新數量
    const newQuantity = inventory.quantity + parseInt(quantityChange);
    
    // 檢查數量不能為負數
    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: '調整後數量不能為負數'
      });
    }

    // 更新庫存數量
    const oldQuantity = inventory.quantity;
    inventory.quantity = newQuantity;
    inventory.updatedBy = req.admin._id;
    inventory.lastUpdated = new Date();
    await inventory.save();

    // 建立交易記錄
    const transaction = new WarehouseTransaction({
      warehouseInventory: id,
      transactionType: transactionType,
      quantityChange: parseInt(quantityChange),
      quantityBefore: oldQuantity,
      quantityAfter: newQuantity,
      unitPrice: inventory.unitPrice,
      totalValue: Math.abs(parseInt(quantityChange)) * inventory.unitPrice,
      project: inventory.project,
      reason: reason || '庫存調整',
      notes: notes || `數量從 ${oldQuantity} 調整為 ${newQuantity}`,
      createdBy: req.admin._id
    });
    await transaction.save();

    // 重新查詢更新後的記錄
    const updatedInventory = await WarehouseInventory.findById(id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .lean();

    res.status(200).json({
      success: true,
      message: '庫存調整成功',
      result: {
        ...updatedInventory,
        quantityChange: parseInt(quantityChange),
        oldQuantity,
        newQuantity
      }
    });

  } catch (error) {
    console.error('Error in warehouse inventory adjust:', error);
    res.status(500).json({
      success: false,
      message: '庫存調整失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(adjust);
