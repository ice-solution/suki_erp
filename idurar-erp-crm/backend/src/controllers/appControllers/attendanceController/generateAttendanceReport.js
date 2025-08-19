const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const generateAttendanceReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID, start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 獲取項目所有員工
    const projectEmployees = await ProjectEmployee.find({
      project: projectId,
      removed: false
    }).populate('employee');

    // 獲取期間內的所有考勤記錄
    const attendanceRecords = await Attendance.find({
      project: projectId,
      date: { $gte: start, $lte: end },
      removed: false
    }).populate([
      {
        path: 'projectEmployee',
        populate: {
          path: 'employee',
          model: 'ContractorEmployee'
        }
      }
    ]);

    // 按員工分組統計
    const employeeStats = {};
    
    projectEmployees.forEach(projectEmp => {
      const empId = projectEmp.employee._id.toString();
      employeeStats[empId] = {
        employee: projectEmp.employee,
        position: projectEmp.position,
        dailyWage: projectEmp.dailyWage,
        workDays: 0,
        absentDays: 0,
        halfDays: 0,
        overtimeDays: 0,
        sickDays: 0,
        vacationDays: 0,
        totalHours: 0,
        totalOvertimeHours: 0,
        totalPay: 0,
        records: []
      };
    });

    // 統計考勤數據
    attendanceRecords.forEach(record => {
      const empId = record.projectEmployee.employee._id.toString();
      if (employeeStats[empId]) {
        const stats = employeeStats[empId];
        
        stats.records.push(record);
        stats.totalPay += record.totalPay || 0;
        stats.totalHours += record.hoursWorked || 0;
        stats.totalOvertimeHours += record.overtimeHours || 0;

        switch (record.status) {
          case 'present':
            stats.workDays++;
            break;
          case 'absent':
            stats.absentDays++;
            break;
          case 'half_day':
            stats.halfDays++;
            break;
          case 'overtime':
            stats.overtimeDays++;
            break;
          case 'sick':
            stats.sickDays++;
            break;
          case 'vacation':
            stats.vacationDays++;
            break;
        }
      }
    });

    // 整體統計
    const totalStats = {
      totalEmployees: Object.keys(employeeStats).length,
      totalWorkDays: Object.values(employeeStats).reduce((sum, emp) => sum + emp.workDays, 0),
      totalAbsentDays: Object.values(employeeStats).reduce((sum, emp) => sum + emp.absentDays, 0),
      totalPay: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalPay, 0),
      totalHours: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalHours, 0),
      totalOvertimeHours: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalOvertimeHours, 0),
    };

    return res.status(200).json({
      success: true,
      result: {
        period: { startDate, endDate },
        totalStats,
        employeeStats: Object.values(employeeStats),
        attendanceRecords
      },
      message: 'Attendance report generated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error generating attendance report: ' + error.message,
    });
  }
};

module.exports = generateAttendanceReport;
