const mongoose = require('mongoose');
const ProjectEmployee = mongoose.model('ProjectEmployee');
const ContractorEmployee = mongoose.model('ContractorEmployee');

const addEmployee = async (req, res) => {
  try {
    const { project, employee, position, dailyWage, startDate, notes } = req.body;

    if (!project || !employee || !position || !dailyWage) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project, employee, position and daily wage are required',
      });
    }

    // 檢查員工是否存在
    const employeeExists = await ContractorEmployee.findById(employee);
    if (!employeeExists) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Employee not found',
      });
    }

    // 檢查員工是否已經在該項目中且狀態為active
    const existingProjectEmployee = await ProjectEmployee.findOne({
      project,
      employee,
      status: 'active',
      removed: false
    });

    if (existingProjectEmployee) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Employee is already active in this project',
      });
    }

    // 創建項目員工記錄
    const projectEmployee = new ProjectEmployee({
      project,
      employee,
      position,
      dailyWage,
      startDate: startDate || new Date(),
      notes: notes || '',
      status: 'active',
      createdBy: req.admin._id,
    });

    await projectEmployee.save();

    // 自動填充關聯數據
    await projectEmployee.populate(['project', 'employee', 'createdBy']);

    return res.status(201).json({
      success: true,
      result: projectEmployee,
      message: 'Employee added to project successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error adding employee to project: ' + error.message,
    });
  }
};

module.exports = addEmployee;
