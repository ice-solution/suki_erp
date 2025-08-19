const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');
const Inventory = mongoose.model('Inventory');

const create = async (req, res) => {
  try {
    const { project, items, notes } = req.body;

    if (!project || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project and items are required',
      });
    }

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

    // 生成出庫單號
    const outboundNumber = await generateOutboundNumber();

    // 計算總金額和處理項目
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

    // 創建出庫記錄
    const outboundRecord = new ProjectOutbound({
      project,
      outboundNumber,
      outboundDate: req.body.outboundDate || new Date(),
      items: processedItems,
      totalAmount,
      notes: notes || '',
      status: 'pending',
      createdBy: req.admin._id,
    });

    await outboundRecord.save();

    // 自動填充關聯數據
    await outboundRecord.populate([
      'project',
      'items.inventory',
      'createdBy'
    ]);

    return res.status(201).json({
      success: true,
      result: outboundRecord,
      message: 'Project outbound record created successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating outbound record: ' + error.message,
    });
  }
};

// 生成出庫單號
async function generateOutboundNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const prefix = `OUT-${year}${month}${day}`;
  
  // 查找當天的最大序號
  const lastRecord = await ProjectOutbound.findOne({
    outboundNumber: { $regex: `^${prefix}` }
  }).sort({ outboundNumber: -1 });

  let sequence = 1;
  if (lastRecord) {
    const lastSequence = parseInt(lastRecord.outboundNumber.split('-')[1].slice(-3));
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

module.exports = create;
