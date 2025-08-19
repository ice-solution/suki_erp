const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const clockIn = async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const { projectId } = req.body;

    // 查找員工在指定項目中的記錄
    const projectEmployee = await ProjectEmployee.findOne({
      employee: employeeId,
      project: projectId,
      status: 'active',
      removed: false
    });

    if (!projectEmployee) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '您不是此項目的員工或項目狀態不正確',
      });
    }

    // 檢查今天是否已經打卡
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      projectEmployee: projectEmployee._id,
      date: today,
      removed: false
    });

    if (existingAttendance && existingAttendance.status === 'present') {
      return res.status(400).json({
        success: false,
        result: null,
        message: '今天已經打卡了',
      });
    }

    const clockInTime = new Date();

    if (existingAttendance) {
      // 更新現有記錄
      existingAttendance.status = 'present';
      existingAttendance.clockIn = clockInTime;
      await existingAttendance.save();
    } else {
      // 創建新記錄
      const attendance = new Attendance({
        project: projectId,
        projectEmployee: projectEmployee._id,
        date: today,
        status: 'present',
        clockIn: clockInTime,
        createdBy: employeeId,
      });
      await attendance.save();
    }

    return res.status(200).json({
      success: true,
      result: {
        clockInTime: clockInTime,
        message: '打卡成功'
      },
      message: '打卡成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '打卡失敗: ' + error.message,
    });
  }
};

module.exports = clockIn;
