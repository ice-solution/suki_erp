const mongoose = require('mongoose');
const ProjectReturn = mongoose.model('ProjectReturn');
const Inventory = mongoose.model('Inventory');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    // 查找退回記錄
    const returnRecord = await ProjectReturn.findOne({
      _id: id,
      removed: false
    });

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Return record not found',
      });
    }

    // 只有 pending 狀態的記錄可以修改
    if (returnRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only pending return records can be updated',
      });
    }

    if (items && Array.isArray(items) && items.length > 0) {
      // 驗證庫存項目存在
      for (const item of items) {
        const inventory = await Inventory.findById(item.inventory);
        if (!inventory) {
          return res.status(400).json({
            success: false,
            result: null,
            message: `Inventory item not found: ${item.inventory}`,
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

      returnRecord.items = processedItems;
      returnRecord.totalAmount = totalAmount;
    }

    if (notes !== undefined) {
      returnRecord.notes = notes;
    }

    await returnRecord.save();

    // 自動填充關聯數據
    await returnRecord.populate([
      'project',
      'items.inventory',
      'createdBy'
    ]);

    return res.status(200).json({
      success: true,
      result: returnRecord,
      message: 'Return record updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating return record: ' + error.message,
    });
  }
};

module.exports = update;
