const mongoose = require('mongoose');

const Project = mongoose.model('Project');

const updateSalary = async (req, res) => {
  try {
    const { projectId, salaryId } = req.params;
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

    // 查找工資記錄
    const salaryIndex = project.salaries.findIndex(
      salary => salary._id.toString() === salaryId
    );

    if (salaryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '工資記錄不存在'
      });
    }

    // 計算總工資
    const totalSalary = dailySalary * (workDays || 0);

    // 使用 $set 直接更新特定的 salary 記錄，避免重新驗證整個項目
    await Project.findOneAndUpdate(
      { _id: projectId, 'salaries._id': salaryId },
      { 
        $set: {
          'salaries.$.contractorEmployee': contractorEmployee,
          'salaries.$.dailySalary': dailySalary,
          'salaries.$.workDays': workDays || 0,
          'salaries.$.totalSalary': totalSalary,
          'salaries.$.notes': notes || '',
          'salaries.$.updated': new Date()
        }
      }
    );

    // 重新查詢項目並 populate 所有 salaries
    const updatedProject = await Project.findById(projectId)
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
      message: '人工記錄更新成功'
    });

  } catch (error) {
    console.error('Error updating salary:', error);
    return res.status(500).json({
      success: false,
      message: '更新人工記錄失敗: ' + error.message
    });
  }
};

module.exports = updateSalary;
