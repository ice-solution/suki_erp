const mongoose = require('mongoose');
const Project = mongoose.model('Project');

const updateAttendance = async (req, res) => {
  try {
    const { projectId, attendanceId } = req.params;
    const { checkInTime, checkOutTime, notes } = req.body;

    // 查找項目
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 查找打咭記錄
    const attendanceRecord = project.onboard.id(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: '打咭記錄不存在'
      });
    }

    // 計算工作時數
    let workHours = attendanceRecord.workHours;
    if (checkOutTime && checkInTime) {
      const checkIn = new Date(`${attendanceRecord.checkInDate.toISOString().split('T')[0]} ${checkInTime}`);
      const checkOut = new Date(`${attendanceRecord.checkInDate.toISOString().split('T')[0]} ${checkOutTime}`);
      workHours = (checkOut - checkIn) / (1000 * 60 * 60);
      workHours = Math.max(0, workHours);
    }

    // 使用 $set 直接更新特定的 attendance 記錄
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, 'onboard._id': attendanceId },
      { 
        $set: {
          'onboard.$.checkInTime': checkInTime || attendanceRecord.checkInTime,
          'onboard.$.checkOutTime': checkOutTime || attendanceRecord.checkOutTime,
          'onboard.$.workHours': workHours,
          'onboard.$.notes': notes !== undefined ? notes : attendanceRecord.notes,
          'onboard.$.updated': new Date()
        }
      },
      { new: true }
    )
    .populate('onboard.contractorEmployee', 'name contractor')
    .populate('onboard.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
      message: '打咭記錄更新成功'
    });

  } catch (error) {
    console.error('更新打咭記錄錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '更新打咭記錄失敗',
      error: error.message
    });
  }
};

module.exports = updateAttendance;

