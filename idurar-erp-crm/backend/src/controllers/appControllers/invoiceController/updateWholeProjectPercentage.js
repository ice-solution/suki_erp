const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const updateWholeProjectPercentage = async (req, res) => {
  try {
    const { wholeProjectPercentage } = req.body;
    const pct = Number(wholeProjectPercentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '整個佔比% 須為 0 至 100 之間的數字',
      });
    }

    const rounded = Math.round(pct * 100) / 100;
    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      { wholeProjectPercentage: rounded },
      { new: true }
    )
      .select('_id wholeProjectPercentage')
      .lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Invoice not found',
      });
    }

    return res.status(200).json({
      success: true,
      result,
      message: '整個佔比% 已更新',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || '更新整個佔比% 失敗',
    });
  }
};

module.exports = updateWholeProjectPercentage;
