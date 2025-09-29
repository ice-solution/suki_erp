const mongoose = require('mongoose');

const Project = mongoose.model('Project');

const deleteSalary = async (req, res) => {
  try {
    const { projectId, salaryId } = req.params;

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

    // 使用 $pull 直接從 salaries 數組中刪除記錄，避免重新驗證整個項目
    await Project.findByIdAndUpdate(
      projectId,
      { $pull: { salaries: { _id: salaryId } } }
    );

    // 重新查詢項目並 populate 所有 salaries
    const updatedProject = await Project.findById(projectId)
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: updatedProject,
      message: '人工記錄刪除成功'
    });

  } catch (error) {
    console.error('Error deleting salary:', error);
    return res.status(500).json({
      success: false,
      message: '刪除人工記錄失敗: ' + error.message
    });
  }
};

module.exports = deleteSalary;
