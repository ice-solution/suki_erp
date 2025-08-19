const mongoose = require('mongoose');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { position, dailyWage, notes } = req.body;

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

    // 更新字段
    if (position !== undefined) projectEmployee.position = position;
    if (dailyWage !== undefined) projectEmployee.dailyWage = dailyWage;
    if (notes !== undefined) projectEmployee.notes = notes;

    await projectEmployee.save();

    // 重新填充數據
    await projectEmployee.populate(['project', 'employee', 'createdBy']);

    return res.status(200).json({
      success: true,
      result: projectEmployee,
      message: 'Project employee updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating project employee: ' + error.message,
    });
  }
};

module.exports = updateEmployee;
