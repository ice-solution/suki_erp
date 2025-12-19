const mongoose = require('mongoose');
const Project = mongoose.model('Project');

/**
 * 獲取指定日期的員工打咭狀態（用於補打咭功能）
 * 返回員工列表和每個員工是否已打咭
 */
const getAttendanceByDate = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '請提供日期參數'
      });
    }

    const contractorId = req.contractor._id;
    const ContractorEmployee = mongoose.model('ContractorEmployee');

    // 查找項目並驗證該 contractor 是否有權限訪問此項目
    const project = await Project.findOne({
      _id: projectId,
      contractors: contractorId,
      removed: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在或您無權限訪問此項目'
      });
    }

    // 從項目的 salaries 中獲取已分配的員工 ID
    const assignedEmployeeIds = project.salaries.map(salary => salary.contractorEmployee);
    
    if (assignedEmployeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        result: {
          date,
          project: {
            _id: project._id,
            name: project.name
          },
          employees: [],
          checkedInCount: 0,
          totalCount: 0
        },
        message: '此項目暫無分配的員工'
      });
    }

    // 查找這些員工的詳細信息（只查找屬於該 contractor 的員工）
    const employees = await ContractorEmployee.find({
      _id: { $in: assignedEmployeeIds },
      contractor: contractorId,
      removed: false,
      enabled: true
    }).select('name phone email position').sort({ name: 1 });

    // 處理日期：確保正確的日期格式比較
    let dateStr;
    if (date.includes('T')) {
      // 如果包含時間，只取日期部分
      dateStr = date.split('T')[0];
    } else {
      dateStr = date; // 已經是 YYYY-MM-DD 格式
    }

    // 獲取該日期的所有打咭記錄
    const attendanceRecords = project.onboard.filter(attendance => {
      if (!attendance.checkInDate) return false;
      
      // 處理各種日期格式
      let attendanceDateStr;
      if (attendance.checkInDate instanceof Date) {
        attendanceDateStr = attendance.checkInDate.toISOString().split('T')[0];
      } else if (typeof attendance.checkInDate === 'string') {
        if (attendance.checkInDate.includes('T')) {
          attendanceDateStr = attendance.checkInDate.split('T')[0];
        } else {
          attendanceDateStr = attendance.checkInDate;
        }
      } else {
        // 嘗試轉換為 Date 對象
        const dateObj = new Date(attendance.checkInDate);
        if (!isNaN(dateObj.getTime())) {
          attendanceDateStr = dateObj.toISOString().split('T')[0];
        } else {
          return false;
        }
      }
      
      return attendanceDateStr === dateStr;
    });

    // 創建員工 ID 到打咭記錄的映射
    const attendanceMap = new Map();
    attendanceRecords.forEach(attendance => {
      const empId = attendance.contractorEmployee.toString();
      attendanceMap.set(empId, attendance);
    });

    // 為每個員工添加打咭狀態
    const employeesWithStatus = employees.map(employee => {
      const empId = employee._id.toString();
      const attendance = attendanceMap.get(empId);
      
      return {
        _id: employee._id,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        position: employee.position,
        hasCheckedIn: !!attendance,
        attendance: attendance ? {
          _id: attendance._id,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          workHours: attendance.workHours,
          notes: attendance.notes
        } : null
      };
    });

    return res.status(200).json({
      success: true,
      result: {
        date,
        project: {
          _id: project._id,
          name: project.name
        },
        employees: employeesWithStatus,
        checkedInCount: attendanceRecords.length,
        totalCount: employees.length
      },
      message: '獲取員工打咭狀態成功'
    });

  } catch (error) {
    console.error('獲取員工打咭狀態失敗:', error);
    return res.status(500).json({
      success: false,
      message: '獲取員工打咭狀態失敗: ' + error.message
    });
  }
};

module.exports = getAttendanceByDate;

