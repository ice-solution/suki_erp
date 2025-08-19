const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');
const Inventory = mongoose.model('Inventory');
const InventoryRecord = mongoose.model('InventoryRecord');

const confirm = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找出庫記錄
    const outboundRecord = await ProjectOutbound.findOne({
      _id: id,
      removed: false
    }).populate(['project', 'items.inventory', 'createdBy']);

    if (!outboundRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Outbound record not found',
      });
    }

    if (outboundRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only pending outbound records can be confirmed',
      });
    }

    // 再次檢查庫存（防止併發問題）
    for (const item of outboundRecord.items) {
      const inventory = await Inventory.findById(item.inventory._id);
      if (!inventory) {
        return res.status(400).json({
          success: false,
          result: null,
          message: `Inventory item not found: ${item.inventory.name}`,
        });
      }

      if (inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          result: null,
          message: `Insufficient stock for ${inventory.name}. Available: ${inventory.quantity}, Required: ${item.quantity}`,
        });
      }
    }

    // 扣減庫存並創建庫存記錄
    const inventoryRecordItems = [];
    
    for (const item of outboundRecord.items) {
      // 扣減庫存
      await Inventory.findByIdAndUpdate(
        item.inventory._id,
        { $inc: { quantity: -item.quantity } }
      );

      // 準備庫存記錄項目
      inventoryRecordItems.push({
        item: item.inventory._id,
        unit: item.quantity,
        type: 'out'
      });
    }

    // 創建庫存記錄
    await InventoryRecord.create({
      billNumber: outboundRecord.outboundNumber,
      date: outboundRecord.outboundDate,
      owner: req.admin._id,
      items: inventoryRecordItems,
      project: outboundRecord.project._id
    });

    // 更新出庫記錄狀態
    outboundRecord.status = 'confirmed';
    outboundRecord.confirmedBy = req.admin._id;
    outboundRecord.confirmedAt = new Date();
    await outboundRecord.save();

    // 重新填充數據
    await outboundRecord.populate(['confirmedBy']);

    return res.status(200).json({
      success: true,
      result: outboundRecord,
      message: 'Outbound record confirmed and inventory updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error confirming outbound record: ' + error.message,
    });
  }
};

module.exports = confirm;
