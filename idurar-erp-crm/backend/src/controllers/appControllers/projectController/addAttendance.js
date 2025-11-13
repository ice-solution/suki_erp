const mongoose = require('mongoose');
const Project = mongoose.model('Project');

const addAttendance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contractorEmployee, checkInDate, checkInTime, checkOutTime, notes } = req.body;

    // 驗證必填字段
    if (!contractorEmployee || !checkInDate || !checkInTime) {
      return res.status(400).json({
        success: false,
        message: '員工、打咭日期和打咭時間為必填字段'
      });
    }

    // 查找項目
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 檢查是否已經有該員工在該日期的打咭記錄
    const existingAttendance = project.onboard.find(
      (attendance) => 
        attendance.contractorEmployee.toString() === contractorEmployee &&
        attendance.checkInDate.toDateString() === new Date(checkInDate).toDateString()
    );

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: '該員工在該日期已有打咭記錄'
      });
    }

    // 計算工作時數
    let workHours = 0;
    if (checkOutTime) {
      const checkIn = new Date(`${checkInDate} ${checkInTime}`);
      const checkOut = new Date(`${checkInDate} ${checkOutTime}`);
      workHours = (checkOut - checkIn) / (1000 * 60 * 60); // 轉換為小時
      workHours = Math.max(0, workHours); // 確保不為負數
    }

    // 創建新的打咭記錄
    const newAttendance = {
      contractorEmployee,
      checkInDate: new Date(checkInDate),
      checkInTime,
      checkOutTime: checkOutTime || null,
      workHours,
      notes: notes || '',
      created: new Date(),
      updated: new Date()
    };

    // 使用 $push 直接更新 onboard 數組，避免重新驗證整個項目
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $push: { onboard: newAttendance } },
      { new: true }
    )
    .populate('onboard.contractorEmployee', 'name contractor')
    .populate('onboard.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
      message: '打咭記錄添加成功'
    });

  } catch (error) {
    console.error('添加打咭記錄錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '添加打咭記錄失敗',
      error: error.message
    });
  }
};

module.exports = addAttendance;


