const mongoose = require('mongoose');

const Project = mongoose.model('Project');

const addSalary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contractorEmployee, dailySalary, workDays, notes } = req.body;

    // 驗證必填字段
    if (!contractorEmployee || !dailySalary) {
      return res.status(400).json({
        success: false,
        message: '員工和日薪為必填字段'
      });
    }

    // 查找項目
    const project = await Project.findOne({ _id: projectId, removed: false });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 檢查員工是否已經有工資記錄
    const existingSalary = project.salaries.find(
      salary => salary.contractorEmployee.toString() === contractorEmployee
    );

    if (existingSalary) {
      return res.status(400).json({
        success: false,
        message: '該員工已有工資記錄，請使用編輯功能'
      });
    }

    // 計算總工資
    const totalSalary = dailySalary * (workDays || 0);

    // 創建新的工資記錄
    const newSalary = {
      contractorEmployee,
      dailySalary,
      workDays: workDays || 0,
      totalSalary,
      notes: notes || '',
      created: new Date(),
      updated: new Date()
    };

    // 使用 $push 直接更新 salaries 數組，避免重新驗證整個項目
    await Project.findByIdAndUpdate(
      projectId,
      { $push: { salaries: newSalary } }
    );

    // 重新查詢項目並 populate 所有 salaries
    const updatedProject = await Project.findById(projectId)
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
      message: '人工記錄添加成功'
    });

  } catch (error) {
    console.error('Error adding salary:', error);
    return res.status(500).json({
      success: false,
      message: '添加人工記錄失敗: ' + error.message
    });
  }
};

module.exports = addSalary;
