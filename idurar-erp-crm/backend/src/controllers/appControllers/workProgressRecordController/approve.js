const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const approve = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

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

    if (progressRecord.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Only submitted records can be approved',
      });
    }

    // 審核通過
    progressRecord.status = 'approved';
    progressRecord.reviewedBy = req.admin._id;
    progressRecord.reviewedAt = new Date();
    progressRecord.reviewNotes = reviewNotes || '';

    await progressRecord.save();

    // 重新填充數據
    await progressRecord.populate([
      'workProcess',
      'project',
      {
        path: 'submittedBy',
        populate: {
          path: 'employee',
          model: 'ContractorEmployee'
        }
      },
      'reviewedBy'
    ]);

    return res.status(200).json({
      success: true,
      result: progressRecord,
      message: 'Progress record approved successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error approving progress record: ' + error.message,
    });
  }
};

module.exports = approve;
