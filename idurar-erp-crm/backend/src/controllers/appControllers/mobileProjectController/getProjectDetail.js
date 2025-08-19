const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const ProjectEmployee = mongoose.model('ProjectEmployee');
const WorkProcess = mongoose.model('WorkProcess');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const getProjectDetail = async (req, res) => {
  try {
    const { projectId } = req.params;
    const employeeId = req.employee._id;

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
        message: '無權限查看此項目',
      });
    }

    // 獲取項目詳細信息
    const project = await Project.findById(projectId)
      .populate('client')
      .populate('contractor')
      .populate('createdBy', 'name');

    if (!project || project.removed) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '項目不存在',
      });
    }

    // 獲取項目工序
    const workProcesses = await WorkProcess.find({
      project: projectId,
      removed: false
    }).populate({
      path: 'assignedTo',
      populate: {
        path: 'employee',
        model: 'ContractorEmployee'
      }
    }).sort({ sequence: 1 });

    // 獲取項目團隊成員
    const teamMembers = await ProjectEmployee.find({
      project: projectId,
      removed: false
    }).populate({
      path: 'employee',
      select: 'name phone position'
    }).sort({ joinDate: 1 });

    // 獲取最近的進度記錄
    const recentProgressRecords = await WorkProgressRecord.find({
      project: projectId,
      removed: false
    })
    .populate({
      path: 'submittedBy',
      populate: {
        path: 'employee',
        select: 'name'
      }
    })
    .populate('workProcess', 'name')
    .sort({ recordDate: -1 })
    .limit(10);

    // 計算項目統計
    const totalProcesses = workProcesses.length;
    const completedProcesses = workProcesses.filter(wp => wp.progress === 100).length;
    const averageProgress = totalProcesses > 0 
      ? Math.round(workProcesses.reduce((sum, wp) => sum + (wp.progress || 0), 0) / totalProcesses)
      : 0;

    const overdueProcesses = workProcesses.filter(wp => 
      wp.plannedEndDate && new Date() > new Date(wp.plannedEndDate) && wp.progress < 100
    ).length;

    const result = {
      project: {
        _id: project._id,
        orderNumber: project.orderNumber,
        projectName: project.projectName,
        description: project.description,
        client: project.client,
        contractor: project.contractor,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        priority: project.priority,
        budget: project.budget,
        location: project.location,
        createdBy: project.createdBy,
        created: project.created
      },
      
      employeeRole: {
        position: projectEmployee.position,
        joinDate: projectEmployee.joinDate,
        hourlyRate: projectEmployee.hourlyRate,
        responsibilities: projectEmployee.responsibilities,
        status: projectEmployee.status
      },

      statistics: {
        totalProcesses,
        completedProcesses,
        averageProgress,
        overdueProcesses
      },

      workProcesses: workProcesses.map(wp => ({
        _id: wp._id,
        name: wp.name,
        description: wp.description,
        sequence: wp.sequence,
        progress: wp.progress || 0,
        status: wp.status,
        plannedStartDate: wp.plannedStartDate,
        plannedEndDate: wp.plannedEndDate,
        actualStartDate: wp.actualStartDate,
        actualEndDate: wp.actualEndDate,
        assignedTo: wp.assignedTo,
        isOverdue: wp.plannedEndDate && new Date() > new Date(wp.plannedEndDate) && wp.progress < 100
      })),

      teamMembers: teamMembers.map(tm => ({
        _id: tm._id,
        employee: tm.employee,
        position: tm.position,
        joinDate: tm.joinDate,
        status: tm.status
      })),

      recentProgress: recentProgressRecords.map(rpr => ({
        _id: rpr._id,
        workProcess: rpr.workProcess,
        submittedBy: rpr.submittedBy,
        recordDate: rpr.recordDate,
        workDescription: rpr.workDescription,
        progressIncrement: rpr.progressIncrement,
        hoursWorked: rpr.hoursWorked,
        status: rpr.status,
        images: rpr.images?.map(img => ({
          filename: img.filename,
          path: img.path
        })) || []
      }))
    };

    return res.status(200).json({
      success: true,
      result,
      message: '獲取項目詳情成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取項目詳情失敗: ' + error.message,
    });
  }
};

module.exports = getProjectDetail;
