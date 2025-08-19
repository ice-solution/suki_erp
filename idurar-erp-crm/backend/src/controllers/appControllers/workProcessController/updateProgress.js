const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, actualHours, actualCost, notes } = req.body;

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Progress must be between 0 and 100',
      });
    }

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

    // 更新進度
    workProcess.progress = progress;
    
    if (actualHours !== undefined) {
      workProcess.actualHours = actualHours;
    }
    
    if (actualCost !== undefined) {
      workProcess.actualCost = actualCost;
    }
    
    if (notes !== undefined) {
      workProcess.notes = notes;
    }

    // 如果進度達到100%，設置實際完成日期
    if (progress === 100 && !workProcess.actualEndDate) {
      workProcess.actualEndDate = new Date();
    }

    // 如果是第一次更新進度（從0開始），設置實際開始日期
    if (progress > 0 && !workProcess.actualStartDate) {
      workProcess.actualStartDate = new Date();
    }

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
      message: 'Work process progress updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating work process progress: ' + error.message,
    });
  }
};

module.exports = updateProgress;
