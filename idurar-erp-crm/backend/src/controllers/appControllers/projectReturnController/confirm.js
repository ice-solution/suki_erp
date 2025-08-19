const mongoose = require('mongoose');
const ProjectReturn = mongoose.model('ProjectReturn');
const Inventory = mongoose.model('Inventory');
const InventoryRecord = mongoose.model('InventoryRecord');

const confirm = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找退回記錄
    const returnRecord = await ProjectReturn.findOne({
      _id: id,
      removed: false
    }).populate(['project', 'items.inventory', 'createdBy']);

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Return record not found',
      });
    }

    if (returnRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only pending return records can be confirmed',
      });
    }

    // 增加庫存並創建庫存記錄
    const inventoryRecordItems = [];
    
    for (const item of returnRecord.items) {
      // 增加庫存
      await Inventory.findByIdAndUpdate(
        item.inventory._id,
        { $inc: { quantity: item.quantity } }
      );

      // 準備庫存記錄項目
      inventoryRecordItems.push({
        item: item.inventory._id,
        unit: item.quantity,
        type: 'in'
      });
    }

    // 創建庫存記錄
    await InventoryRecord.create({
      billNumber: returnRecord.returnNumber,
      date: returnRecord.returnDate,
      owner: req.admin._id,
      items: inventoryRecordItems,
      project: returnRecord.project._id
    });

    // 更新退回記錄狀態
    returnRecord.status = 'confirmed';
    returnRecord.confirmedBy = req.admin._id;
    returnRecord.confirmedAt = new Date();
    await returnRecord.save();

    // 重新填充數據
    await returnRecord.populate(['confirmedBy']);

    return res.status(200).json({
      success: true,
      result: returnRecord,
      message: 'Return record confirmed and inventory updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error confirming return record: ' + error.message,
    });
  }
};

module.exports = confirm;
