const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const getTodayAttendance = async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const { projectId } = req.query;

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

    // 查找今天的考勤記錄
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      projectEmployee: projectEmployee._id,
      date: today,
      removed: false
    });

    return res.status(200).json({
      success: true,
      result: {
        attendance: attendance || null,
        today: today,
        hasAttendance: attendance ? attendance.status === 'present' : false,
        hasClockIn: attendance ? !!attendance.clockIn : false,
        hasClockOut: attendance ? !!attendance.clockOut : false
      },
      message: '獲取今日考勤記錄成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取考勤記錄失敗: ' + error.message,
    });
  }
};

module.exports = getTodayAttendance;
