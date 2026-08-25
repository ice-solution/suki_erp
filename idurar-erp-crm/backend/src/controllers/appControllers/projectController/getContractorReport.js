const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Contractor = mongoose.model('Contractor');
const ContractorEmployee = mongoose.model('ContractorEmployee');
const { parseHongKongDayRange, toHongKongDateKey } = require('@/helpers/hongKongMoment');
const { computeSalaryTotal, getPaidLeaveAmount } = require('./salaryTotal');
const { getAttendanceDayValue } = require('./calculateWorkDays');

const isDateInRange = (date, from, to) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return d >= from && d <= to;
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
    const employeeOids = contractorEmployees.map((e) => e._id);

    // 唔再用 startDate 過濾：好多項目 startDate 為空但已有打咭
    const projects = await Project.find({
      removed: false,
      $or: [
        { contractors: contractorId },
        { 'onboard.contractorEmployee': { $in: employeeOids } },
        { 'salaries.contractorEmployee': { $in: employeeOids } },
      ],
    })
      .select('name invoiceNumber poNumber contractors onboard salaries startDate')
      .populate('onboard.contractorEmployee', 'name contractor')
      .lean();

    const projectRows = projects
      .map((project) => {
        const employeeDateMap = {};
        const salaryByEmp = {};

        (project.salaries || []).forEach((s) => {
          const empId = s.contractorEmployee
            ? String(s.contractorEmployee._id || s.contractorEmployee)
            : '';
          if (!employeeIdSet.has(empId)) return;
          salaryByEmp[empId] = {
            dailySalary: Number(s.dailySalary) || 0,
            paidLeaveAmount: getPaidLeaveAmount(s),
          };
        });

        (project.onboard || []).forEach((record) => {
          const emp = record.contractorEmployee;
          const empId = emp && emp._id ? String(emp._id) : String(record.contractorEmployee || '');
          if (!employeeIdSet.has(empId)) return;
          if (!isDateInRange(record.checkInDate, range.from, range.to)) return;
          const dateKey = toHongKongDateKey(record.checkInDate);
          if (!dateKey) return;
          if (!employeeDateMap[empId]) employeeDateMap[empId] = new Map();
          const value = getAttendanceDayValue(record);
          const prev = employeeDateMap[empId].get(dateKey) || 0;
          if (value > prev) employeeDateMap[empId].set(dateKey, value);
        });

        const employees = Object.keys(employeeDateMap)
          .map((empId) => {
            const dateMap = employeeDateMap[empId];
            const dateList = Array.from(dateMap.keys()).sort();
            const info = employeeMap[empId] || {};
            const salaryInfo = salaryByEmp[empId] || {};
            const dailySalary = salaryInfo.dailySalary || 0;
            const paidLeaveAmount = salaryInfo.paidLeaveAmount || 0;
            let totalWorkDays = 0;
            dateMap.forEach((v) => {
              totalWorkDays += v;
            });
            return {
              employeeId: empId,
              employeeName: info.name || '-',
              employmentStatus: info.employmentStatus || '在職',
              resignationDate: info.resignationDate || null,
              dailySalary,
              paidLeaveAmount,
              totalWorkDays,
              totalSalary: computeSalaryTotal(dailySalary, totalWorkDays, paidLeaveAmount),
              workDates: dateList,
            };
          })
          .sort((a, b) => b.totalWorkDays - a.totalWorkDays);

        if (employees.length === 0) return null;

        return {
          projectId: project._id,
          projectName: project.name || '-',
          quoteNumber: project.invoiceNumber || '-',
          poNumber: project.poNumber || '-',
          startDate: project.startDate || null,
          employeeCount: employees.length,
          totalWorkDays: employees.reduce((sum, e) => sum + e.totalWorkDays, 0),
          totalSalary: employees.reduce((sum, e) => sum + e.totalSalary, 0),
          employees,
        };
      })
      .filter(Boolean);

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
          totalEmployees: new Set(projectRows.flatMap((p) => p.employees.map((e) => e.employeeId)))
            .size,
          totalWorkDays: projectRows.reduce((sum, p) => sum + p.totalWorkDays, 0),
          totalSalary: projectRows.reduce((sum, p) => sum + p.totalSalary, 0),
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
