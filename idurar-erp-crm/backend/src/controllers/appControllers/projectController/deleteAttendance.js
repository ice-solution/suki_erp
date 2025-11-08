const mongoose = require('mongoose');
const Project = mongoose.model('Project');

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

    // 使用 $pull 直接從 onboard 數組中刪除記錄
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { onboard: { _id: attendanceId } } },
      { new: true }
    )
    .populate('onboard.contractorEmployee', 'name contractor')
    .populate('onboard.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
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

