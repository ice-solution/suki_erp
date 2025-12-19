const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const { calculateWorkDaysFromAttendance } = require('./calculateWorkDays');

const deleteAttendance = async (req, res) => {
  try {
    const { projectId, attendanceId } = req.params;

    // 查找項目
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 檢查打咭記錄是否存在
    const attendanceRecord = project.onboard.id(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: '打咭記錄不存在'
      });
    }

    // 保存員工 ID 以便後續計算工作天數
    const contractorEmployeeId = attendanceRecord.contractorEmployee;

    // 使用 $pull 直接從 onboard 數組中刪除記錄
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { onboard: { _id: attendanceId } } },
      { new: true }
    )
    .populate('onboard.contractorEmployee', 'name contractor')
    .populate('onboard.contractorEmployee.contractor', 'name');

    // 根據打咭記錄自動計算並更新該員工的工作天數
    try {
      await calculateWorkDaysFromAttendance(projectId, contractorEmployeeId);
    } catch (error) {
      console.error('計算工作天數時發生錯誤:', error);
      // 即使計算失敗，打咭記錄仍已刪除成功，所以繼續返回成功響應
    }

    // 重新查詢項目以獲取最新的數據
    const finalProject = await Project.findById(projectId)
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('onboard.contractorEmployee.contractor', 'name')
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: finalProject,
      message: '打咭記錄刪除成功'
    });

  } catch (error) {
    console.error('刪除打咭記錄錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '刪除打咭記錄失敗',
      error: error.message
    });
  }
};

module.exports = deleteAttendance;


