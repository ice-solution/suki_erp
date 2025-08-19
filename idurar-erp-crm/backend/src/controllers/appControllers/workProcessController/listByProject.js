const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const listByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, category, priority } = req.query;

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
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const workProcesses = await WorkProcess.find(query)
      .populate([
        'project',
        {
          path: 'assignedTo',
          populate: {
            path: 'employee',
            model: 'ContractorEmployee'
          }
        },
        'dependencies',
        'createdBy'
      ])
      .sort({ sequence: 1 });

    // 計算統計信息
    const statistics = {
      total: workProcesses.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      delayed: 0,
      overdue: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      totalBudgetCost: 0,
      totalActualCost: 0,
      averageProgress: 0
    };

    const now = new Date();
    workProcesses.forEach(process => {
      // 狀態統計
      switch (process.status) {
        case 'pending':
          statistics.pending++;
          break;
        case 'in_progress':
          statistics.inProgress++;
          break;
        case 'completed':
          statistics.completed++;
          break;
        case 'delayed':
          statistics.delayed++;
          break;
      }

      // 超期檢查
      if (process.isOverdue) {
        statistics.overdue++;
      }

      // 時間和成本統計
      statistics.totalEstimatedHours += process.estimatedHours || 0;
      statistics.totalActualHours += process.actualHours || 0;
      statistics.totalBudgetCost += process.budgetCost || 0;
      statistics.totalActualCost += process.actualCost || 0;
    });

    // 計算平均進度
    if (workProcesses.length > 0) {
      const totalProgress = workProcesses.reduce((sum, process) => sum + process.progress, 0);
      statistics.averageProgress = Math.round(totalProgress / workProcesses.length);
    }

    return res.status(200).json({
      success: true,
      result: {
        processes: workProcesses,
        statistics
      },
      message: `Successfully fetched ${workProcesses.length} work processes`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching work processes: ' + error.message,
    });
  }
};

module.exports = listByProject;
