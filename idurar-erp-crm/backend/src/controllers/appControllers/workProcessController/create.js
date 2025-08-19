const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const create = async (req, res) => {
  try {
    const {
      project,
      name,
      description,
      sequence,
      plannedStartDate,
      plannedEndDate,
      estimatedHours,
      assignedTo,
      dependencies,
      category,
      priority,
      budgetCost,
      notes,
      isMilestone
    } = req.body;

    if (!project || !name || !sequence || !plannedStartDate || !plannedEndDate) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project, name, sequence, planned start date and planned end date are required',
      });
    }

    // 檢查計劃日期是否合理
    if (new Date(plannedStartDate) >= new Date(plannedEndDate)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Planned end date must be after planned start date',
      });
    }

    // 檢查序號是否重複
    const existingProcess = await WorkProcess.findOne({
      project,
      sequence,
      removed: false
    });

    if (existingProcess) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Sequence number already exists in this project',
      });
    }

    // 創建工序
    const workProcess = new WorkProcess({
      project,
      name,
      description: description || '',
      sequence,
      plannedStartDate: new Date(plannedStartDate),
      plannedEndDate: new Date(plannedEndDate),
      estimatedHours: estimatedHours || 0,
      assignedTo: assignedTo || [],
      dependencies: dependencies || [],
      category: category || 'other',
      priority: priority || 'medium',
      budgetCost: budgetCost || 0,
      notes: notes || '',
      isMilestone: isMilestone || false,
      createdBy: req.admin._id,
    });

    await workProcess.save();

    // 自動填充關聯數據
    await workProcess.populate([
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
    ]);

    return res.status(201).json({
      success: true,
      result: workProcess,
      message: 'Work process created successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating work process: ' + error.message,
    });
  }
};

module.exports = create;
