const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const { recalculateAllWorkDays } = require('./calculateWorkDays');

/**
 * 手動重新計算項目中所有員工的工作天數
 * 根據打咭記錄自動更新每個員工的 workDays 和 totalSalary
 */
const recalculateWorkDays = async (req, res) => {
  try {
    const { projectId } = req.params;

    // 查找項目
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 重新計算所有員工的工作天數
    await recalculateAllWorkDays(projectId);

    // 重新查詢項目以獲取最新的數據
    const updatedProject = await Project.findById(projectId)
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name')
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('onboard.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
      message: '工作天數重新計算成功'
    });

  } catch (error) {
    console.error('重新計算工作天數錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '重新計算工作天數失敗',
      error: error.message
    });
  }
};

module.exports = recalculateWorkDays;

