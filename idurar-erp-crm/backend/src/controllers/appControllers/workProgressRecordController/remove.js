const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找進度記錄
    const progressRecord = await WorkProgressRecord.findOne({
      _id: id,
      removed: false
    });

    if (!progressRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Progress record not found',
      });
    }

    // 只有draft或submitted狀態的記錄可以刪除
    if (progressRecord.status === 'approved') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot delete approved progress record',
      });
    }

    // 軟刪除
    progressRecord.removed = true;
    await progressRecord.save();

    return res.status(200).json({
      success: true,
      result: progressRecord,
      message: 'Progress record deleted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting progress record: ' + error.message,
    });
  }
};

module.exports = remove;
