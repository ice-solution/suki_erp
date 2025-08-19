const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const getProjectSchedule = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID is required',
      });
    }

    const workProcesses = await WorkProcess.find({
      project: projectId,
      removed: false
    })
    .populate([
      'project',
      {
        path: 'assignedTo',
        populate: {
          path: 'employee',
          model: 'ContractorEmployee'
        }
      },
      'dependencies'
    ])
    .sort({ sequence: 1 });

    // 計算項目整體信息
    const now = new Date();
    let projectStartDate = null;
    let projectEndDate = null;
    let totalProgress = 0;
    let overdueCount = 0;
    let criticalCount = 0;

    const scheduleData = workProcesses.map(process => {
      // 更新項目開始和結束日期
      if (!projectStartDate || process.plannedStartDate < projectStartDate) {
        projectStartDate = process.plannedStartDate;
      }
      if (!projectEndDate || process.plannedEndDate > projectEndDate) {
        projectEndDate = process.plannedEndDate;
      }

      // 計算進度
      totalProgress += process.progress;

      // 檢查超期
      if (process.isOverdue) {
        overdueCount++;
      }

      // 檢查關鍵路徑
      if (process.priority === 'critical') {
        criticalCount++;
      }

      // 計算工期
      const duration = Math.ceil((process.plannedEndDate - process.plannedStartDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...process.toObject(),
        duration,
        isOverdue: process.isOverdue,
        remainingDays: process.remainingDays,
        progressStatus: getProgressStatus(process)
      };
    });

    // 計算項目整體進度
    const overallProgress = workProcesses.length > 0 ? Math.round(totalProgress / workProcesses.length) : 0;

    // 計算項目總工期
    const totalDuration = projectStartDate && projectEndDate ? 
      Math.ceil((projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24)) : 0;

    // 項目狀態分析
    const projectStatus = getProjectStatus(workProcesses, overallProgress, overdueCount);

    const summary = {
      totalProcesses: workProcesses.length,
      overallProgress,
      overdueCount,
      criticalCount,
      projectStartDate,
      projectEndDate,
      totalDuration,
      projectStatus,
      statusDistribution: getStatusDistribution(workProcesses),
      upcomingDeadlines: getUpcomingDeadlines(workProcesses)
    };

    return res.status(200).json({
      success: true,
      result: {
        schedule: scheduleData,
        summary
      },
      message: 'Project schedule fetched successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching project schedule: ' + error.message,
    });
  }
};

// 獲取進度狀態
function getProgressStatus(process) {
  if (process.status === 'completed') return 'completed';
  if (process.isOverdue) return 'overdue';
  if (process.status === 'delayed') return 'delayed';
  if (process.progress > 0) return 'in_progress';
  return 'pending';
}

// 獲取項目整體狀態
function getProjectStatus(processes, overallProgress, overdueCount) {
  if (processes.every(p => p.status === 'completed')) return 'completed';
  if (overdueCount > 0) return 'delayed';
  if (overallProgress > 0) return 'in_progress';
  return 'pending';
}

// 獲取狀態分佈
function getStatusDistribution(processes) {
  const distribution = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    delayed: 0,
    cancelled: 0
  };

  processes.forEach(process => {
    distribution[process.status]++;
  });

  return distribution;
}

// 獲取即將到期的工序
function getUpcomingDeadlines(processes) {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return processes
    .filter(process => 
      process.status !== 'completed' && 
      process.status !== 'cancelled' &&
      process.plannedEndDate <= sevenDaysFromNow
    )
    .map(process => ({
      id: process._id,
      name: process.name,
      plannedEndDate: process.plannedEndDate,
      progress: process.progress,
      isOverdue: process.isOverdue,
      remainingDays: process.remainingDays
    }))
    .sort((a, b) => a.plannedEndDate - b.plannedEndDate);
}

module.exports = getProjectSchedule;
