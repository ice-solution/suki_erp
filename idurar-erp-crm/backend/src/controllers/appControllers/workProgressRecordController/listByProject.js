const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const listByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, submittedBy, workProcess, startDate, endDate } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID is required',
      });
    }

    // 構建查詢條件
    const query = {
      project: projectId,
      removed: false
    };

    if (status) query.status = status;
    if (submittedBy) query.submittedBy = submittedBy;
    if (workProcess) query.workProcess = workProcess;

    // 日期範圍篩選
    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) {
        query.recordDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.recordDate.$lte = new Date(endDate);
      }
    }

    const progressRecords = await WorkProgressRecord.find(query)
      .populate([
        'workProcess',
        'project',
        {
          path: 'submittedBy',
          populate: {
            path: 'employee',
            model: 'ContractorEmployee'
          }
        },
        'reviewedBy'
      ])
      .sort({ recordDate: -1, created: -1 });

    // 按工序分組統計
    const workProcessStats = {};
    const employeeStats = {};

    progressRecords.forEach(record => {
      const processId = record.workProcess._id.toString();
      const employeeId = record.submittedBy._id.toString();

      // 工序統計
      if (!workProcessStats[processId]) {
        workProcessStats[processId] = {
          workProcess: record.workProcess,
          recordCount: 0,
          totalHours: 0,
          totalProgressIncrement: 0,
          lastUpdate: null
        };
      }
      workProcessStats[processId].recordCount++;
      workProcessStats[processId].totalHours += record.hoursWorked || 0;
      workProcessStats[processId].totalProgressIncrement += record.progressIncrement || 0;
      if (!workProcessStats[processId].lastUpdate || record.recordDate > workProcessStats[processId].lastUpdate) {
        workProcessStats[processId].lastUpdate = record.recordDate;
      }

      // 員工統計
      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          employee: record.submittedBy,
          recordCount: 0,
          totalHours: 0,
          workProcesses: new Set()
        };
      }
      employeeStats[employeeId].recordCount++;
      employeeStats[employeeId].totalHours += record.hoursWorked || 0;
      employeeStats[employeeId].workProcesses.add(processId);
    });

    // 轉換Set為數組
    Object.values(employeeStats).forEach(stat => {
      stat.workProcessCount = stat.workProcesses.size;
      delete stat.workProcesses;
    });

    return res.status(200).json({
      success: true,
      result: {
        records: progressRecords,
        workProcessStats: Object.values(workProcessStats),
        employeeStats: Object.values(employeeStats),
        totalRecords: progressRecords.length
      },
      message: `Successfully fetched ${progressRecords.length} progress records for project`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching project progress records: ' + error.message,
    });
  }
};

module.exports = listByProject;
