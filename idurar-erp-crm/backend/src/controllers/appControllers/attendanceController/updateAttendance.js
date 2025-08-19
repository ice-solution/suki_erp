const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, clockIn, clockOut, workDescription, notes } = req.body;

    // 查找考勤記錄
    const attendance = await Attendance.findOne({
      _id: id,
      removed: false
    }).populate('projectEmployee');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Attendance record not found',
      });
    }

    // 如果已確認，不能修改
    if (attendance.confirmed) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot update confirmed attendance record',
      });
    }

    // 更新字段
    if (status !== undefined) attendance.status = status;
    if (clockIn !== undefined) attendance.clockIn = clockIn ? new Date(clockIn) : null;
    if (clockOut !== undefined) attendance.clockOut = clockOut ? new Date(clockOut) : null;
    if (workDescription !== undefined) attendance.workDescription = workDescription;
    if (notes !== undefined) attendance.notes = notes;

    // 重新計算薪資
    if (status !== undefined || clockIn !== undefined || clockOut !== undefined) {
      const { actualWage, overtimePay, totalPay, overtimeHours } = calculateWage(
        attendance.status,
        attendance.projectEmployee.dailyWage,
        attendance.clockIn,
        attendance.clockOut
      );
      
      attendance.actualWage = actualWage;
      attendance.overtimePay = overtimePay;
      attendance.totalPay = totalPay;
      attendance.overtimeHours = overtimeHours;
    }

    await attendance.save();

    // 重新填充數據
    await attendance.populate(['project', 'projectEmployee', 'createdBy']);

    return res.status(200).json({
      success: true,
      result: attendance,
      message: 'Attendance record updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating attendance record: ' + error.message,
    });
  }
};

// 計算薪資的輔助函數（與創建時相同）
function calculateWage(status, dailyWage, clockIn, clockOut) {
  let actualWage = 0;
  let overtimeHours = 0;
  let overtimePay = 0;
  let totalPay = 0;

  switch (status) {
    case 'present':
      actualWage = dailyWage;
      break;
    case 'half_day':
      actualWage = dailyWage * 0.5;
      break;
    case 'absent':
    case 'sick':
    case 'vacation':
      actualWage = 0;
      break;
    case 'overtime':
      actualWage = dailyWage;
      if (clockIn && clockOut) {
        const workHours = (clockOut - clockIn) / (1000 * 60 * 60);
        if (workHours > 8) {
          overtimeHours = workHours - 8;
          overtimePay = overtimeHours * (dailyWage / 8) * 1.5;
        }
      }
      break;
  }

  totalPay = actualWage + overtimePay;
  
  return { actualWage, overtimePay, totalPay, overtimeHours };
}

module.exports = updateAttendance;
