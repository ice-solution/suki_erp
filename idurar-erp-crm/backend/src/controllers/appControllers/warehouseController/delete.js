const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找存倉記錄
    const inventory = await WarehouseInventory.findById(id);
    if (!inventory || inventory.removed) {
      return res.status(404).json({
        success: false,
        message: '存倉記錄不存在'
      });
    }

    // 檢查是否有庫存
    if (inventory.quantity > 0) {
      return res.status(400).json({
        success: false,
        message: '該項目仍有庫存，無法刪除。請先將庫存調整為0。'
      });
    }

    // 軟刪除存倉記錄
    inventory.removed = true;
    inventory.updatedBy = req.admin._id;
    await inventory.save();

    // 軟刪除相關的交易記錄
    await WarehouseTransaction.updateMany(
      { warehouseInventory: id },
      { 
        $set: { 
          removed: true,
          updatedBy: req.admin._id
        }
      }
    );

    res.status(200).json({
      success: true,
      message: '存倉記錄刪除成功'
    });

  } catch (error) {
    console.error('Error in warehouse inventory delete:', error);
    res.status(500).json({
      success: false,
      message: '刪除存倉記錄失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(deleteItem);
