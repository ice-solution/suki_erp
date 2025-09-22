const mongoose = require('mongoose');

const Model = mongoose.model('ProjectItem');

const list = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = parseInt(req.query.items) || 50; // 增加默認數量
    const skip = page * limit - limit;

    const { sortBy = 'itemName', sortValue = 1, category, isFrequent } = req.query;

    let query = { removed: false, enabled: true };
    
    // 分類過濾
    if (category) {
      query.category = category;
    }
    
    // 常用項目過濾
    if (isFrequent !== undefined) {
      query.isFrequent = isFrequent === 'true';
    }

    const resultsPromise = Model.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ isFrequent: -1, [sortBy]: sortValue }) // 常用項目優先
      .populate('createdBy', 'name');

    const countPromise = Model.countDocuments(query);

    const [result, count] = await Promise.all([resultsPromise, countPromise]);

    const pages = Math.ceil(count / limit);
    const pagination = { page, pages, count };

    if (count > 0) {
      return res.status(200).json({
        success: true,
        result: { items: result },
        pagination,
        message: 'Successfully found all ProjectItems',
      });
    } else {
      return res.status(203).json({
        success: true,
        result: { items: [] },
        pagination,
        message: 'No ProjectItems found',
      });
    }

  } catch (error) {
    console.error('Error listing ProjectItems:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error listing ProjectItems: ' + error.message,
    });
  }
};

module.exports = list;