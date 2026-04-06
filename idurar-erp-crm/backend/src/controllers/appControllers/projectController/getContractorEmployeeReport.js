const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const ContractorEmployee = mongoose.model('ContractorEmployee');

const normalizeDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDayRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return { error: '請提供開始與結束日期（dateFrom、dateTo）' };
  const parseLocalDay = (s, endOfDay) => {
    const part = String(s).slice(0, 10).split('-').map((x) => parseInt(x, 10));
    if (part.length !== 3 || part.some((n) => Number.isNaN(n))) return null;
    const [y, m, d] = part;
    return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  };
  const from = parseLocalDay(dateFrom, false);
  const to = parseLocalDay(dateTo, true);
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: '日期格式不正確' };
  }
  if (from > to) return { error: '開始日期不可晚於結束日期' };
  return { from, to };
};

/**
 * GET /project/contractor-employee-report?contractorEmployeeId=&dateFrom=&dateTo=
 * 依項目 startDate 篩選，列出該承辦商員工參與的項目（onboard 或 salaries 有該員工），
 * 並統計該員工在各項目之打咭日（詳細日期、上班總天數）。
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

    const range = parseDayRange(dateFrom, dateTo);
    if (range.error) {
      return res.status(400).json({
        success: false,
        result: null,
        message: range.error,
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

    const projects = await Project.find({
      removed: false,
      startDate: { $gte: range.from, $lte: range.to },
      $or: [{ 'onboard.contractorEmployee': empOid }, { 'salaries.contractorEmployee': empOid }],
    })
      .select('name invoiceNumber poNumber onboard startDate')
      .populate('onboard.contractorEmployee', 'name')
      .sort({ startDate: 1, invoiceNumber: 1 })
      .lean();

    const projectRows = projects.map((project) => {
      const workDateSet = new Set();

      (project.onboard || []).forEach((record) => {
        const id =
          record.contractorEmployee && record.contractorEmployee._id
            ? String(record.contractorEmployee._id)
            : String(record.contractorEmployee || '');
        if (id !== empIdStr) return;
        const normalized = normalizeDate(record.checkInDate);
        if (!normalized) return;
        workDateSet.add(normalized.toISOString().slice(0, 10));
      });

      const workDates = Array.from(workDateSet).sort();

      return {
        projectId: project._id,
        projectName: project.name || '-',
        quoteNumber: project.invoiceNumber || '-',
        poNumber: project.poNumber || '-',
        startDate: project.startDate || null,
        totalWorkDays: workDates.length,
        workDates,
      };
    });

    const contractor = employee.contractor;
    const contractorInfo = contractor && typeof contractor === 'object'
      ? {
          _id: contractor._id,
          name: contractor.name || '-',
          accountCode: contractor.accountCode || '',
        }
      : { _id: null, name: '-', accountCode: '' };

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
          totalWorkDays: projectRows.reduce((sum, p) => sum + p.totalWorkDays, 0),
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
