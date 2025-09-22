const mongoose = require('mongoose');

const Model = mongoose.model('ProjectItem');

const search = async (req, res) => {
  try {
    const { q = '', category, isFrequent } = req.query;
    
    let query = { removed: false, enabled: true };
    
    // 搜索條件
    if (q) {
      query.$or = [
        { itemName: { $regex: new RegExp(q, 'i') } },
        { description: { $regex: new RegExp(q, 'i') } },
      ];
    }
    
    // 分類過濾
    if (category) {
      query.category = category;
    }
    
    // 常用項目過濾
    if (isFrequent !== undefined) {
      query.isFrequent = isFrequent === 'true';
    }

    const result = await Model.find(query)
      .sort({ isFrequent: -1, itemName: 1 }) // 常用項目優先
      .limit(50) // 限制搜索結果數量
      .populate('supplier', 'name')
      .exec();

    return res.status(200).json({
      success: true,
      result,
      message: `Found ${result.length} ProjectItems`,
    });

  } catch (error) {
    console.error('Error searching ProjectItems:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error searching ProjectItems: ' + error.message,
    });
  }
};

module.exports = search;
