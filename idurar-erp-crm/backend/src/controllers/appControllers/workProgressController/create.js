const mongoose = require('mongoose');

const Model = mongoose.model('WorkProgress');

const create = async (req, res) => {
  try {
    const { 
      projectId, 
      poNumber, 
      items = [], 
      completionDate,
      days = 1, // 向後兼容
      notes = ''
    } = req.body;

    // 驗證必要字段
    if (!projectId || !poNumber || !completionDate) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID, P.O Number, and Completion Date are required',
      });
    }

    const results = [];
    const startDate = new Date();
    const completionDateObj = new Date(completionDate);

    // 為每個item創建一個WorkProgress
    for (const item of items) {
      const workProgressData = {
        project: projectId,
        poNumber,
        item: {
          itemName: item.itemName,
          description: item.description || '',
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          sourceQuote: item.sourceQuote,
          sourceQuoteId: item.sourceQuoteId,
        },
        contractorEmployee: item.contractorEmployee || null, // 每個item可以分配不同員工
        days: days || Math.ceil((completionDateObj - startDate) / (24 * 60 * 60 * 1000)), // 計算天數
        completionDate: completionDateObj,
        startDate,
        expectedEndDate: completionDateObj, // 使用完工日期作為預期結束日期
        progress: 0,
        status: 'pending',
        history: [],
        notes,
        createdBy: req.admin._id,
      };

      const result = await new Model(workProgressData).save();
      results.push(result);
    }

    return res.status(200).json({
      success: true,
      result: results,
      message: `Successfully created ${results.length} WorkProgress records`,
    });

  } catch (error) {
    console.error('Error creating WorkProgress:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating WorkProgress: ' + error.message,
    });
  }
};

module.exports = create;
