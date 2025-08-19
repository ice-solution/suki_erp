const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const clockOut = async (req, res) => {
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

    // 查找今天的考勤記錄
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      projectEmployee: projectEmployee._id,
      date: today,
      removed: false
    });

    if (!attendance || attendance.status !== 'present') {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請先打卡',
      });
    }

    if (attendance.clockOut) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '今天已經打卡了',
      });
    }

    const clockOutTime = new Date();

    // 更新下班時間
    attendance.clockOut = clockOutTime;
    await attendance.save();

    return res.status(200).json({
      success: true,
      result: {
        clockOutTime: clockOutTime,
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

module.exports = clockOut;
