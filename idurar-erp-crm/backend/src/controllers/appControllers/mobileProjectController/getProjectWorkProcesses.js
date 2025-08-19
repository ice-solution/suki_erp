const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const getProjectWorkProcesses = async (req, res) => {
  try {
    const { projectId } = req.params;
    const employeeId = req.employee._id;
    const { status, assignedToMe } = req.query;

    // 驗證員工是否有權限查看此項目
    const projectEmployee = await ProjectEmployee.findOne({
      project: projectId,
      employee: employeeId,
      removed: false
    });

    if (!projectEmployee) {
      return res.status(403).json({
        success: false,
        result: null,
        message: '無權限查看此項目的工序',
      });
    }

    // 構建查詢條件
    const query = {
      project: projectId,
      removed: false
    };

    if (status) {
      query.status = status;
    }

    // 如果只查看分配給我的工序
    if (assignedToMe === 'true') {
      query['assignedTo'] = projectEmployee._id;
    }

    // 獲取工序列表
    const workProcesses = await WorkProcess.find(query)
      .populate({
        path: 'assignedTo',
        populate: {
          path: 'employee',
          select: 'name phone'
        }
      })
      .populate('dependencies', 'name status')
      .sort({ sequence: 1 });

    // 處理返回數據
    const processesData = workProcesses.map(wp => {
      const isOverdue = wp.plannedEndDate && new Date() > new Date(wp.plannedEndDate) && wp.progress < 100;
      const isAssignedToMe = wp.assignedTo && wp.assignedTo.some(assignee => 
        assignee._id.toString() === projectEmployee._id.toString()
      );

      return {
        _id: wp._id,
        name: wp.name,
        description: wp.description,
        sequence: wp.sequence,
        progress: wp.progress || 0,
        status: wp.status,
        priority: wp.priority,
        plannedStartDate: wp.plannedStartDate,
        plannedEndDate: wp.plannedEndDate,
        actualStartDate: wp.actualStartDate,
        actualEndDate: wp.actualEndDate,
        estimatedHours: wp.estimatedHours,
        actualHours: wp.actualHours,
        assignedTo: wp.assignedTo,
        dependencies: wp.dependencies,
        isOverdue,
        isAssignedToMe,
        canRecord: isAssignedToMe || projectEmployee.position === '項目經理' // 項目經理可以記錄所有工序
      };
    });

    // 統計信息
    const stats = {
      total: processesData.length,
      pending: processesData.filter(p => p.status === 'pending').length,
      inProgress: processesData.filter(p => p.status === 'in_progress').length,
      completed: processesData.filter(p => p.status === 'completed').length,
      overdue: processesData.filter(p => p.isOverdue).length,
      assignedToMe: processesData.filter(p => p.isAssignedToMe).length,
      averageProgress: processesData.length > 0 
        ? Math.round(processesData.reduce((sum, p) => sum + p.progress, 0) / processesData.length)
        : 0
    };

    return res.status(200).json({
      success: true,
      result: {
        workProcesses: processesData,
        stats
      },
      message: `成功獲取 ${processesData.length} 個工序`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取工序列表失敗: ' + error.message,
    });
  }
};

module.exports = getProjectWorkProcesses;
