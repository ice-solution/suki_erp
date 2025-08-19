const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');
const Inventory = mongoose.model('Inventory');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    // 查找出庫記錄
    const outboundRecord = await ProjectOutbound.findOne({
      _id: id,
      removed: false
    });

    if (!outboundRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Outbound record not found',
      });
    }

    // 只有 pending 狀態的記錄可以修改
    if (outboundRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only pending outbound records can be updated',
      });
    }

    if (items && Array.isArray(items) && items.length > 0) {
      // 驗證庫存是否足夠
      for (const item of items) {
        const inventory = await Inventory.findById(item.inventory);
        if (!inventory) {
          return res.status(400).json({
            success: false,
            result: null,
            message: `Inventory item not found: ${item.inventory}`,
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

      // 重新計算總金額和處理項目
      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const inventory = await Inventory.findById(item.inventory);
        const unitCost = inventory.cost || 0;
        const totalCost = item.quantity * unitCost;
        totalAmount += totalCost;

        processedItems.push({
          inventory: item.inventory,
          quantity: item.quantity,
          unitCost: unitCost,
          totalCost: totalCost,
          notes: item.notes || '',
        });
      }

      outboundRecord.items = processedItems;
      outboundRecord.totalAmount = totalAmount;
    }

    if (notes !== undefined) {
      outboundRecord.notes = notes;
    }

    await outboundRecord.save();

    // 自動填充關聯數據
    await outboundRecord.populate([
      'project',
      'items.inventory',
      'createdBy'
    ]);

    return res.status(200).json({
      success: true,
      result: outboundRecord,
      message: 'Outbound record updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating outbound record: ' + error.message,
    });
  }
};

module.exports = update;
