const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

/**
 * 生成下一個可用的 SKU 編號
 * 從 A100 開始，依序遞增（A101, A102, ...）
 */
async function generateNextSKU() {
  try {
    // 查找所有以 "A" 開頭的 SKU（不包含已刪除的記錄）
    const existingSKUs = await WarehouseInventory.find({
      sku: { $regex: /^A\d+$/i },
      removed: false
    }).select('sku').lean();

    if (existingSKUs.length === 0) {
      // 如果沒有找到任何 A 開頭的 SKU，從 A100 開始
      return 'A100';
    }

    // 提取所有數字部分並找到最大值
    let maxNumber = 99; // 從 99 開始，這樣第一個會是 A100
    existingSKUs.forEach(item => {
      if (item.sku) {
        const match = item.sku.match(/^A(\d+)$/i);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    });

    // 生成下一個 SKU
    const nextNumber = maxNumber + 1;
    return `A${nextNumber}`;
  } catch (error) {
    console.error('生成 SKU 失敗:', error);
    // 如果出錯，返回 A100 作為默認值
    return 'A100';
  }
}

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

    // 如果沒有提供 SKU，自動生成下一個可用的 SKU
    let finalSku = sku;
    if (!finalSku || finalSku.trim() === '') {
      finalSku = await generateNextSKU();
    }

    // 檢查SKU是否已存在
    if (finalSku) {
      const existingItem = await WarehouseInventory.findOne({ 
        sku: finalSku, 
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
      sku: finalSku,
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
