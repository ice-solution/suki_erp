const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const createAttendance = async (req, res) => {
  try {
    const { projectEmployee, date, status, clockIn, clockOut, workDescription, notes } = req.body;

    if (!projectEmployee || !date || !status) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project employee, date and status are required',
      });
    }

    // 檢查項目員工是否存在且active
    const projectEmp = await ProjectEmployee.findOne({
      _id: projectEmployee,
      status: 'active',
      removed: false
    });

    if (!projectEmp) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project employee not found or not active',
      });
    }

    // 檢查當天是否已有考勤記錄
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      projectEmployee,
      date: attendanceDate,
      removed: false
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Attendance record already exists for this date',
      });
    }

    // 計算薪資
    const { actualWage, overtimePay, totalPay, overtimeHours } = calculateWage(
      status, 
      projectEmp.dailyWage, 
      clockIn, 
      clockOut
    );

    // 創建考勤記錄
    const attendance = new Attendance({
      project: projectEmp.project,
      projectEmployee,
      date: attendanceDate,
      status,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      overtimeHours,
      actualWage,
      overtimePay,
      totalPay,
      workDescription: workDescription || '',
      notes: notes || '',
      createdBy: req.admin._id,
    });

    await attendance.save();

    // 自動填充關聯數據
    await attendance.populate(['project', 'projectEmployee', 'createdBy']);

    return res.status(201).json({
      success: true,
      result: attendance,
      message: 'Attendance record created successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating attendance record: ' + error.message,
    });
  }
};

// 計算薪資的輔助函數
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
      // 如果有打卡時間，計算加班費
      if (clockIn && clockOut) {
        const workHours = (new Date(clockOut) - new Date(clockIn)) / (1000 * 60 * 60);
        if (workHours > 8) {
          overtimeHours = workHours - 8;
          overtimePay = overtimeHours * (dailyWage / 8) * 1.5; // 加班費1.5倍
        }
      }
      break;
  }

  totalPay = actualWage + overtimePay;
  
  return { actualWage, overtimePay, totalPay, overtimeHours };
}

module.exports = createAttendance;
