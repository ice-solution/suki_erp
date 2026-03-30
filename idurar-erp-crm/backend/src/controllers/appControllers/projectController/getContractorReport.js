const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Contractor = mongoose.model('Contractor');
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

const getContractorReport = async (req, res) => {
  try {
    const { contractorId, dateFrom, dateTo } = req.query;
    if (!contractorId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'contractorId is required',
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

    const contractor = await Contractor.findOne({ _id: contractorId, removed: false })
      .select('name accountCode')
      .lean();
    if (!contractor) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '承辦商不存在',
      });
    }

    const contractorEmployees = await ContractorEmployee.find({
      removed: false,
      contractor: contractorId,
    })
      .select('_id name employmentStatus resignationDate')
      .lean();

    const employeeIdSet = new Set(contractorEmployees.map((e) => String(e._id)));
    const employeeMap = contractorEmployees.reduce((acc, e) => {
      acc[String(e._id)] = e;
      return acc;
    }, {});

    const projects = await Project.find({
      removed: false,
      startDate: { $gte: range.from, $lte: range.to },
      $or: [
        { contractors: contractorId },
        { 'onboard.contractorEmployee': { $in: contractorEmployees.map((e) => e._id) } },
        { 'salaries.contractorEmployee': { $in: contractorEmployees.map((e) => e._id) } },
      ],
    })
      .select('name invoiceNumber poNumber contractors onboard startDate')
      .populate('onboard.contractorEmployee', 'name contractor')
      .lean();

    const projectRows = projects.map((project) => {
      const employeeDateMap = {};

      (project.onboard || []).forEach((record) => {
        const emp = record.contractorEmployee;
        const empId = emp && emp._id ? String(emp._id) : String(record.contractorEmployee || '');
        if (!employeeIdSet.has(empId)) return;
        const normalized = normalizeDate(record.checkInDate);
        if (!normalized) return;
        if (!employeeDateMap[empId]) employeeDateMap[empId] = new Set();
        employeeDateMap[empId].add(normalized.toISOString().slice(0, 10));
      });

      const employees = Object.keys(employeeDateMap)
        .map((empId) => {
          const dateList = Array.from(employeeDateMap[empId]).sort();
          const info = employeeMap[empId] || {};
          return {
            employeeId: empId,
            employeeName: info.name || '-',
            employmentStatus: info.employmentStatus || '在職',
            resignationDate: info.resignationDate || null,
            totalWorkDays: dateList.length,
            workDates: dateList,
          };
        })
        .sort((a, b) => b.totalWorkDays - a.totalWorkDays);

      return {
        projectId: project._id,
        projectName: project.name || '-',
        quoteNumber: project.invoiceNumber || '-',
        poNumber: project.poNumber || '-',
        startDate: project.startDate || null,
        employeeCount: employees.length,
        totalWorkDays: employees.reduce((sum, e) => sum + e.totalWorkDays, 0),
        employees,
      };
    });

    return res.status(200).json({
      success: true,
      result: {
        contractor: {
          _id: contractor._id,
          name: contractor.name || '-',
          accountCode: contractor.accountCode || '',
        },
        summary: {
          totalProjects: projectRows.length,
          totalEmployees: new Set(
            projectRows.flatMap((p) => p.employees.map((e) => e.employeeId))
          ).size,
          totalWorkDays: projectRows.reduce((sum, p) => sum + p.totalWorkDays, 0),
          dateFrom: String(dateFrom).slice(0, 10),
          dateTo: String(dateTo).slice(0, 10),
        },
        projects: projectRows,
      },
      message: '承辦商報告查詢成功',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || '承辦商報告查詢失敗',
    });
  }
};

module.exports = getContractorReport;

