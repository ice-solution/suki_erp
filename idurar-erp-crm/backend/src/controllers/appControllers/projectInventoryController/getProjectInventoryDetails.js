const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');
const ProjectReturn = mongoose.model('ProjectReturn');

const getProjectInventoryDetails = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID is required',
      });
    }

    // 獲取出庫記錄
    const outboundRecords = await ProjectOutbound.find({
      project: projectId,
      removed: false,
      status: 'confirmed' // 只顯示已確認的記錄
    })
    .populate([
      'items.inventory',
      'createdBy',
      'confirmedBy'
    ])
    .sort({ confirmedAt: -1 });

    // 獲取退回記錄
    const returnRecords = await ProjectReturn.find({
      project: projectId,
      removed: false,
      status: 'confirmed' // 只顯示已確認的記錄
    })
    .populate([
      'items.inventory',
      'createdBy',
      'confirmedBy'
    ])
    .sort({ confirmedAt: -1 });

    // 整理出庫明細
    const outboundDetails = [];
    outboundRecords.forEach(record => {
      record.items.forEach(item => {
        outboundDetails.push({
          recordId: record._id,
          recordNumber: record.outboundNumber,
          date: record.confirmedAt,
          type: 'outbound',
          typeName: '出庫',
          inventory: {
            _id: item.inventory._id,
            name: item.inventory.name,
            unit: item.inventory.unit,
            category: item.inventory.category,
          },
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          notes: item.notes,
          operator: record.confirmedBy?.name || '系統',
          createdBy: record.createdBy?.name || '未知'
        });
      });
    });

    // 整理退回明細
    const returnDetails = [];
    returnRecords.forEach(record => {
      record.items.forEach(item => {
        returnDetails.push({
          recordId: record._id,
          recordNumber: record.returnNumber,
          date: record.confirmedAt,
          type: 'return',
          typeName: '退回',
          inventory: {
            _id: item.inventory._id,
            name: item.inventory.name,
            unit: item.inventory.unit,
            category: item.inventory.category,
          },
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          notes: item.notes,
          operator: record.confirmedBy?.name || '系統',
          createdBy: record.createdBy?.name || '未知'
        });
      });
    });

    // 合併並按時間排序
    const allDetails = [...outboundDetails, ...returnDetails]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // 統計匯總
    const summary = {
      totalOutbound: outboundDetails.length,
      totalReturn: returnDetails.length,
      totalOutboundAmount: outboundDetails.reduce((sum, item) => sum + item.totalCost, 0),
      totalReturnAmount: returnDetails.reduce((sum, item) => sum + item.totalCost, 0),
      inventoryItems: {}
    };

    // 按庫存項目統計
    allDetails.forEach(detail => {
      const inventoryId = detail.inventory._id.toString();
      if (!summary.inventoryItems[inventoryId]) {
        summary.inventoryItems[inventoryId] = {
          inventory: detail.inventory,
          outboundQuantity: 0,
          returnQuantity: 0,
          netQuantity: 0,
          outboundAmount: 0,
          returnAmount: 0,
          netAmount: 0
        };
      }

      const item = summary.inventoryItems[inventoryId];
      if (detail.type === 'outbound') {
        item.outboundQuantity += detail.quantity;
        item.outboundAmount += detail.totalCost;
      } else {
        item.returnQuantity += detail.quantity;
        item.returnAmount += detail.totalCost;
      }
      item.netQuantity = item.outboundQuantity - item.returnQuantity;
      item.netAmount = item.outboundAmount - item.returnAmount;
    });

    return res.status(200).json({
      success: true,
      result: {
        details: allDetails,
        summary: {
          ...summary,
          inventoryItems: Object.values(summary.inventoryItems)
        }
      },
      message: `Successfully fetched ${allDetails.length} inventory movement records`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching project inventory details: ' + error.message,
    });
  }
};

module.exports = getProjectInventoryDetails;
