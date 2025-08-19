const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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

    // 只有draft或submitted狀態的記錄可以修改
    if (progressRecord.status === 'approved') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot update approved progress record',
      });
    }

    // 更新字段
    const allowedFields = [
      'recordDate',
      'workDescription',
      'completedWork',
      'progressIncrement',
      'hoursWorked',
      'materialsUsed',
      'location',
      'qualityCheck'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        progressRecord[field] = updateData[field];
      }
    });

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
      message: 'Progress record updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating progress record: ' + error.message,
    });
  }
};

module.exports = update;
