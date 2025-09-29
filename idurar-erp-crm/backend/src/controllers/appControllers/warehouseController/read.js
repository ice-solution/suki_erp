const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const WarehouseTransaction = require('../../../models/appModels/WarehouseTransaction');
const { catchErrors } = require('../../../handlers/errorHandlers');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找存倉記錄
    const inventory = await WarehouseInventory.findById(id)
      .populate('supplier', 'name email phone')
      .populate('project', 'name description')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!inventory || inventory.removed) {
      return res.status(404).json({
        success: false,
        message: '存倉記錄不存在'
      });
    }

    // 獲取相關的交易記錄
    const transactions = await WarehouseTransaction.find({ 
      warehouseInventory: id 
    })
      .populate('project', 'name')
      .populate('supplierQuote', 'number')
      .populate('purchaseOrder', 'number')
      .populate('createdBy', 'name')
      .sort({ transactionDate: -1 })
      .limit(20)
      .lean();

    // 計算統計信息
    const stats = await WarehouseTransaction.aggregate([
      { $match: { warehouseInventory: inventory._id } },
      {
        $group: {
          _id: '$transactionType',
          totalQuantity: { $sum: '$quantityChange' },
          totalValue: { $sum: '$totalValue' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      result: {
        ...inventory,
        transactions,
        stats
      }
    });

  } catch (error) {
    console.error('Error in warehouse inventory read:', error);
    res.status(500).json({
      success: false,
      message: '獲取存倉記錄失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(read);
