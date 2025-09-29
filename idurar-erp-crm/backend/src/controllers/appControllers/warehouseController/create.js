const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

const create = async (req, res) => {
  try {
    const {
      itemName,
      description,
      sku,
      quantity,
      warehouse,
      unitPrice,
      supplier,
      project,
      status = 'available',
      minStockLevel = 0,
      location,
      notes
    } = req.body;

    // 驗證必填欄位
    if (!itemName || !quantity || !warehouse) {
      return res.status(400).json({
        success: false,
        message: '貨品名稱、數量和倉庫為必填欄位'
      });
    }

    // 檢查SKU是否已存在
    if (sku) {
      const existingItem = await WarehouseInventory.findOne({ 
        sku: sku, 
        removed: false 
      });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'SKU已存在，請使用不同的SKU'
        });
      }
    }

    // 建立存倉記錄
    const inventoryData = {
      itemName,
      description,
      sku,
      quantity: parseInt(quantity),
      warehouse,
      unitPrice: parseFloat(unitPrice) || 0,
      supplier,
      project,
      status,
      minStockLevel: parseInt(minStockLevel) || 0,
      location,
      notes,
      createdBy: req.admin._id
    };

    const warehouseInventory = new WarehouseInventory(inventoryData);
    await warehouseInventory.save();

    // 建立入庫交易記錄
    if (parseInt(quantity) > 0) {
      const transaction = new WarehouseTransaction({
        warehouseInventory: warehouseInventory._id,
        transactionType: 'inbound',
        quantityChange: parseInt(quantity),
        quantityBefore: 0,
        quantityAfter: parseInt(quantity),
        unitPrice: parseFloat(unitPrice) || 0,
        totalValue: (parseInt(quantity) * (parseFloat(unitPrice) || 0)),
        project,
        reason: '初始入庫',
        notes: '系統自動建立',
        createdBy: req.admin._id
      });
      await transaction.save();
    }

    // 重新查詢包含關聯數據的記錄
    const populatedInventory = await WarehouseInventory.findById(warehouseInventory._id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name')
      .lean();

    res.status(201).json({
      success: true,
      message: '存倉記錄建立成功',
      result: populatedInventory
    });

  } catch (error) {
    console.error('Error in warehouse inventory create:', error);
    res.status(500).json({
      success: false,
      message: '建立存倉記錄失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(create);
