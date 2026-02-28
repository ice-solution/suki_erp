const mongoose = require('mongoose');
const Project = mongoose.model('Project');

/** 從 attendance.checkInDate 取得 YYYY-MM-DD 字串（支援多種格式） */
function getDateStr(checkInDate) {
  if (!checkInDate) return null;
  if (checkInDate instanceof Date) {
    return checkInDate.toISOString().split('T')[0];
  }
  if (typeof checkInDate === 'string') {
    return checkInDate.includes('T') ? checkInDate.split('T')[0] : checkInDate;
  }
  const dateObj = new Date(checkInDate);
  return !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : null;
}

/** 從 ref 取得 ObjectId 字串（支援 ObjectId 或 populated 物件） */
function getEmpId(ref) {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) return ref._id.toString();
  return ref.toString();
}

/**
 * 獲取指定日期的員工打咭狀態（用於補打咭功能）
 * 返回員工列表和每個員工是否已打咭，以及當日打咭記錄（直接從 onboard 取，不依賴 salaries）
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

    const dateStr = date.includes('T') ? date.split('T')[0] : date;

    // 查找項目，populate onboard.contractorEmployee 以取得員工姓名
    const project = await Project.findOne({
      _id: projectId,
      contractors: contractorId,
      removed: false
    })
      .populate('onboard.contractorEmployee', 'name contractor')
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在或您無權限訪問此項目'
      });
    }

    const onboard = project.onboard || [];

    // 直接從 onboard 篩選當日打咭記錄（不依賴 salaries）
    const attendanceRecords = onboard.filter((attendance) => {
      const d = getDateStr(attendance.checkInDate);
      return d && d === dateStr;
    });

    // 只顯示屬於此 contractor 的員工記錄
    const contractorIdStr = contractorId.toString();
    const recordsForContractor = [];
    const empIdsInRecords = new Set();

    for (const att of attendanceRecords) {
      const empRef = att.contractorEmployee;
      const empId = getEmpId(empRef);
      if (!empId) continue;
      const emp = empRef && typeof empRef === 'object' && !(empRef instanceof mongoose.Types.ObjectId) ? empRef : null;
      if (emp && emp.contractor) {
        const empContractorId = (emp.contractor._id || emp.contractor).toString();
        if (empContractorId !== contractorIdStr) continue;
      }

      empIdsInRecords.add(empId);
      recordsForContractor.push({
        _id: att._id,
        contractorEmployee: empId,
        name: emp && emp.name ? emp.name : '—',
        checkInTime: att.checkInTime || null,
        checkOutTime: att.checkOutTime || null,
        workHours: att.workHours ?? null,
        notes: att.notes || null
      });
    }

    // 對無 populate 的記錄補查員工名稱，並排除不屬於此 contractor 的記錄
    const toRemove = new Set();
    for (const r of recordsForContractor) {
      if (r.name === '—') {
        const emp = await ContractorEmployee.findById(r.contractorEmployee)
          .select('name contractor')
          .lean();
        if (!emp || (emp.contractor && emp.contractor.toString() !== contractorIdStr)) {
          toRemove.add(r.contractorEmployee);
        } else {
          r.name = emp.name || '—';
        }
      }
    }
    const recordsFiltered = recordsForContractor.filter((r) => !toRemove.has(r.contractorEmployee));

    // 從 salaries 取得員工列表（用於打咭表單）
    const assignedEmployeeIds = (project.salaries || [])
      .map((s) => {
        const ref = s.contractorEmployee;
        if (!ref) return null;
        return (ref._id || ref).toString();
      })
      .filter(Boolean);
    const employees = await ContractorEmployee.find({
      _id: { $in: assignedEmployeeIds.length ? assignedEmployeeIds : [] },
      contractor: contractorId,
      removed: false,
      enabled: true
    })
      .select('name phone email position')
      .sort({ name: 1 })
      .lean();

    const attendanceMap = new Map();
    recordsFiltered.forEach((r) => attendanceMap.set(r.contractorEmployee, r));

    const employeesWithStatus = employees.map((emp) => {
      const empId = emp._id.toString();
      const att = attendanceMap.get(empId);
      return {
        _id: emp._id,
        name: emp.name,
        phone: emp.phone,
        email: emp.email,
        position: emp.position,
        hasCheckedIn: !!att,
        attendance: att
          ? {
              _id: att._id,
              checkInTime: att.checkInTime,
              checkOutTime: att.checkOutTime,
              workHours: att.workHours,
              notes: att.notes
            }
          : null
      };
    });

    return res.status(200).json({
      success: true,
      result: {
        date,
        project: { _id: project._id, name: project.name },
        employees: employeesWithStatus,
        attendanceRecords: recordsFiltered,
        checkedInCount: recordsFiltered.length,
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

