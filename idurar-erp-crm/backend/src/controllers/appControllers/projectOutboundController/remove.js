const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找出庫記錄
    const outboundRecord = await ProjectOutbound.findOne({
      _id: id,
      removed: false
    });

    if (!outboundRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Outbound record not found',
      });
    }

    // 只有 pending 狀態的記錄可以刪除
    if (outboundRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only pending outbound records can be deleted',
      });
    }

    // 軟刪除
    outboundRecord.removed = true;
    await outboundRecord.save();

    return res.status(200).json({
      success: true,
      result: outboundRecord,
      message: 'Outbound record deleted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting outbound record: ' + error.message,
    });
  }
};

module.exports = remove;
