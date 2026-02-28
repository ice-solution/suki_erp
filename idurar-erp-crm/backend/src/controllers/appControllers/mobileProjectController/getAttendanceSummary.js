const mongoose = require('mongoose');
const Project = mongoose.model('Project');

/** 從 attendance.checkInDate 取得 YYYY-MM-DD 字串 */
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

/** 從 ref 取得 ObjectId 字串 */
function getEmpId(ref) {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) return ref._id.toString();
  return ref.toString();
}

/**
 * 獲取項目打咭摘要：按員工分組，返回 人名、總人工（打咭天數）、打咭日期列表
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const contractorId = req.contractor._id;
    const ContractorEmployee = mongoose.model('ContractorEmployee');
    const contractorIdStr = contractorId.toString();

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
    const byEmployee = new Map(); // empId -> { name, dates: Set }

    for (const att of onboard) {
      const empRef = att.contractorEmployee;
      const empId = getEmpId(empRef);
      if (!empId) continue;

      const emp = empRef && typeof empRef === 'object' && !(empRef instanceof mongoose.Types.ObjectId)
        ? empRef
        : null;
      if (emp && emp.contractor) {
        const empContractorId = (emp.contractor._id || emp.contractor).toString();
        if (empContractorId !== contractorIdStr) continue;
      }

      const dateStr = getDateStr(att.checkInDate);
      if (!dateStr) continue;

      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, {
          contractorEmployee: empId,
          name: emp && emp.name ? emp.name : '—',
          dates: []
        });
      }
      const entry = byEmployee.get(empId);
      if (!entry.dates.includes(dateStr)) {
        entry.dates.push(dateStr);
      }
    }

    // 補查員工名稱，排除非此 contractor 的員工
    const toRemove = new Set();
    for (const [empId, entry] of byEmployee.entries()) {
      if (entry.name === '—') {
        const emp = await ContractorEmployee.findById(empId)
          .select('name contractor')
          .lean();
        if (!emp || (emp.contractor && emp.contractor.toString() !== contractorIdStr)) {
          toRemove.add(empId);
        } else {
          entry.name = emp.name || '—';
        }
      }
    }
    toRemove.forEach((id) => byEmployee.delete(id));

    // 從 salaries 取得各員工的 totalSalary（總金額）
    const salaryByEmp = new Map();
    for (const s of project.salaries || []) {
      const ref = s.contractorEmployee;
      const empId = ref ? (ref._id || ref).toString() : null;
      if (empId) {
        salaryByEmp.set(empId, s.totalSalary ?? (s.dailySalary || 0) * (s.workDays || 0));
      }
    }

    const summary = Array.from(byEmployee.values()).map((entry) => ({
      contractorEmployee: entry.contractorEmployee,
      name: entry.name,
      totalWorkDays: entry.dates.length,
      totalAmount: salaryByEmp.get(entry.contractorEmployee) ?? 0,
      dates: entry.dates.sort()
    }));

    return res.status(200).json({
      success: true,
      result: { summary },
      message: '獲取打咭摘要成功'
    });
  } catch (error) {
    console.error('獲取打咭摘要失敗:', error);
    return res.status(500).json({
      success: false,
      message: '獲取打咭摘要失敗: ' + error.message
    });
  }
};

module.exports = getAttendanceSummary;
