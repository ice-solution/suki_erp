const mongoose = require('mongoose');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const removeEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找項目員工記錄
    const projectEmployee = await ProjectEmployee.findOne({
      _id: id,
      removed: false
    });

    if (!projectEmployee) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Project employee record not found',
      });
    }

    // 設置結束日期並改變狀態
    projectEmployee.endDate = new Date();
    projectEmployee.status = 'inactive';
    await projectEmployee.save();

    // 重新填充數據
    await projectEmployee.populate(['project', 'employee', 'createdBy']);

    return res.status(200).json({
      success: true,
      result: projectEmployee,
      message: 'Employee removed from project successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error removing employee from project: ' + error.message,
    });
  }
};

module.exports = removeEmployee;
