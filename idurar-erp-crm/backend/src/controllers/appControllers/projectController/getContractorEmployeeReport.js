const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const ContractorEmployee = mongoose.model('ContractorEmployee');
const { parseHongKongDayRange, toHongKongDateKey } = require('@/helpers/hongKongMoment');
const { computeSalaryTotal, getPaidLeaveAmount } = require('./salaryTotal');
const { getAttendanceDayValue } = require('./calculateWorkDays');

const isDateInRange = (date, from, to) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return d >= from && d <= to;
};

/**
 * GET /project/contractor-employee-report?contractorEmployeeId=&dateFrom=&dateTo=
 * 依「打咭日期」篩選（唔依賴項目 startDate；startDate 為空仍會列出），
 * 並列出日薪／範圍內天數／工資。日期範圍以香港日曆日解讀。
 */
const getContractorEmployeeReport = async (req, res) => {
  try {
    const { contractorEmployeeId, dateFrom, dateTo } = req.query;
    if (!contractorEmployeeId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'contractorEmployeeId is required',
      });
    }

    if (!mongoose.isValidObjectId(contractorEmployeeId)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'contractorEmployeeId 格式不正確',
      });
    }

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請提供開始與結束日期（dateFrom、dateTo）',
      });
    }

    const range = parseHongKongDayRange(dateFrom, dateTo);
    if (!range) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '日期格式不正確',
      });
    }
    if (range.from > range.to) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '開始日期不可晚於結束日期',
      });
    }

    const employee = await ContractorEmployee.findOne({
      _id: contractorEmployeeId,
      removed: false,
    })
      .populate('contractor', 'name accountCode')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '承辦商員工不存在',
      });
    }

    const empOid = new mongoose.Types.ObjectId(contractorEmployeeId);
    const empIdStr = String(contractorEmployeeId);

    // 唔再用 startDate 過濾：好多項目 startDate 為空但已有打咭
    const projects = await Project.find({
      removed: false,
      $or: [{ 'onboard.contractorEmployee': empOid }, { 'salaries.contractorEmployee': empOid }],
    })
      .select('name invoiceNumber poNumber onboard salaries startDate')
      .populate('onboard.contractorEmployee', 'name')
      .sort({ startDate: 1, invoiceNumber: 1 })
      .lean();

    const projectRows = projects
      .map((project) => {
        const workDateMap = new Map();

        (project.onboard || []).forEach((record) => {
          const id =
            record.contractorEmployee && record.contractorEmployee._id
              ? String(record.contractorEmployee._id)
              : String(record.contractorEmployee || '');
          if (id !== empIdStr) return;
          if (!isDateInRange(record.checkInDate, range.from, range.to)) return;
          const dateKey = toHongKongDateKey(record.checkInDate);
          if (!dateKey) return;
          const value = getAttendanceDayValue(record);
          const prev = workDateMap.get(dateKey) || 0;
          if (value > prev) workDateMap.set(dateKey, value);
        });

        const workDates = Array.from(workDateMap.keys()).sort();
        const salary = (project.salaries || []).find((s) => {
          const id =
            s.contractorEmployee && s.contractorEmployee._id
              ? String(s.contractorEmployee._id)
              : String(s.contractorEmployee || '');
          return id === empIdStr;
        });
        const dailySalary = Number(salary?.dailySalary) || 0;
        const paidLeaveAmount = getPaidLeaveAmount(salary);
        let totalWorkDays = 0;
        workDateMap.forEach((v) => {
          totalWorkDays += v;
        });
        const totalSalary = computeSalaryTotal(dailySalary, totalWorkDays, paidLeaveAmount);

        // 只列出範圍內有打咭的項目
        if (totalWorkDays === 0) return null;

        return {
          projectId: project._id,
          projectName: project.name || '-',
          quoteNumber: project.invoiceNumber || '-',
          poNumber: project.poNumber || '-',
          startDate: project.startDate || null,
          dailySalary,
          paidLeaveAmount,
          totalWorkDays,
          totalSalary,
          workDates,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = a.workDates[0] || '';
        const db = b.workDates[0] || '';
        return da.localeCompare(db);
      });

    const contractor = employee.contractor;
    const contractorInfo =
      contractor && typeof contractor === 'object'
        ? {
            _id: contractor._id,
            name: contractor.name || '-',
            accountCode: contractor.accountCode || '',
          }
        : { _id: null, name: '-', accountCode: '' };

    const totalWorkDays = projectRows.reduce((sum, p) => sum + p.totalWorkDays, 0);
    const totalSalary = projectRows.reduce((sum, p) => sum + p.totalSalary, 0);

    return res.status(200).json({
      success: true,
      result: {
        employee: {
          _id: employee._id,
          name: employee.name || '-',
          employmentStatus: employee.employmentStatus || '在職',
          resignationDate: employee.resignationDate || null,
          contractor: contractorInfo,
        },
        summary: {
          totalProjects: projectRows.length,
          totalWorkDays,
          totalSalary,
          dateFrom: String(dateFrom).slice(0, 10),
          dateTo: String(dateTo).slice(0, 10),
        },
        projects: projectRows,
      },
      message: '承辦商員工報告查詢成功',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || '承辦商員工報告查詢失敗',
    });
  }
};

module.exports = getContractorEmployeeReport;
