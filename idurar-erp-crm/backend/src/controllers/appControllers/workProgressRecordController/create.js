const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');
const WorkProcess = mongoose.model('WorkProcess');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const create = async (req, res) => {
  try {
    const {
      workProcess,
      project,
      submittedBy,
      recordDate,
      workDescription,
      completedWork,
      progressIncrement,
      hoursWorked,
      materialsUsed,
      location,
      qualityCheck,
      images
    } = req.body;

    if (!workProcess || !project || !submittedBy || !workDescription || !completedWork || hoursWorked === undefined) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Work process, project, submitted by, work description, completed work and hours worked are required',
      });
    }

    // 驗證工序是否存在
    const workProcessExists = await WorkProcess.findById(workProcess);
    if (!workProcessExists) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Work process not found',
      });
    }

    // 驗證提交者是否為該項目的員工
    const projectEmployee = await ProjectEmployee.findOne({
      _id: submittedBy,
      project: project,
      status: 'active',
      removed: false
    });

    if (!projectEmployee) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Submitter is not an active employee of this project',
      });
    }

    // 創建進度記錄
    const progressRecord = new WorkProgressRecord({
      workProcess,
      project,
      submittedBy,
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      workDescription,
      completedWork,
      progressIncrement: progressIncrement || 0,
      hoursWorked,
      materialsUsed: materialsUsed || [],
      location: location || '',
      qualityCheck: qualityCheck || { status: 'not_applicable' },
      images: images || [],
      status: 'submitted'
    });

    await progressRecord.save();

    // 如果有進度增量，更新工序進度和工時
    if (progressIncrement > 0) {
      const newProgress = Math.min(workProcessExists.progress + progressIncrement, 100);
      const newActualHours = (workProcessExists.actualHours || 0) + hoursWorked;
      
      await WorkProcess.findByIdAndUpdate(workProcess, {
        progress: newProgress,
        actualHours: newActualHours
      });
    } else {
      // 即使沒有進度增量，也要更新工時
      const newActualHours = (workProcessExists.actualHours || 0) + hoursWorked;
      await WorkProcess.findByIdAndUpdate(workProcess, {
        actualHours: newActualHours
      });
    }

    // 自動填充關聯數據
    await progressRecord.populate([
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
    ]);

    return res.status(201).json({
      success: true,
      result: progressRecord,
      message: 'Work progress record created successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating work progress record: ' + error.message,
    });
  }
};

module.exports = create;
