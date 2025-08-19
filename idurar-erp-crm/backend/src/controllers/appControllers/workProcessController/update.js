const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 查找工序
    const workProcess = await WorkProcess.findOne({
      _id: id,
      removed: false
    });

    if (!workProcess) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Work process not found',
      });
    }

    // 如果更新日期，檢查日期合理性
    const plannedStartDate = updateData.plannedStartDate || workProcess.plannedStartDate;
    const plannedEndDate = updateData.plannedEndDate || workProcess.plannedEndDate;
    
    if (new Date(plannedStartDate) >= new Date(plannedEndDate)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Planned end date must be after planned start date',
      });
    }

    // 如果更新序號，檢查是否重複
    if (updateData.sequence && updateData.sequence !== workProcess.sequence) {
      const existingProcess = await WorkProcess.findOne({
        project: workProcess.project,
        sequence: updateData.sequence,
        _id: { $ne: id },
        removed: false
      });

      if (existingProcess) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Sequence number already exists in this project',
        });
      }
    }

    // 更新工序
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'project' && key !== 'createdBy') {
        workProcess[key] = updateData[key];
      }
    });

    await workProcess.save();

    // 重新填充數據
    await workProcess.populate([
      'project',
      {
        path: 'assignedTo',
        populate: {
          path: 'employee',
          model: 'ContractorEmployee'
        }
      },
      'dependencies',
      'createdBy'
    ]);

    return res.status(200).json({
      success: true,
      result: workProcess,
      message: 'Work process updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating work process: ' + error.message,
    });
  }
};

module.exports = update;
