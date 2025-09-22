const mongoose = require('mongoose');

const Model = mongoose.model('WorkProgress');

const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = (page - 1) * limit;

    // 可以按項目ID過濾
    const filter = { removed: false };
    if (req.query.projectId) {
      filter.project = req.query.projectId;
    }

    const results = await Model.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ created: -1 })
      .exec();

    const count = await Model.countDocuments(filter);

    return res.status(200).json({
      success: true,
      result: {
        items: results,
        pagination: {
          page,
          pages: Math.ceil(count / limit),
          count,
          limit
        }
      },
      message: 'WorkProgress list retrieved successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error retrieving WorkProgress list: ' + error.message,
    });
  }
};

module.exports = list;
