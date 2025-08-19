const mongoose = require('mongoose');
const ProjectReturn = mongoose.model('ProjectReturn');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

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

    // 只有 pending 狀態的記錄可以刪除
    if (returnRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only pending return records can be deleted',
      });
    }

    // 軟刪除
    returnRecord.removed = true;
    await returnRecord.save();

    return res.status(200).json({
      success: true,
      result: returnRecord,
      message: 'Return record deleted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting return record: ' + error.message,
    });
  }
};

module.exports = remove;
