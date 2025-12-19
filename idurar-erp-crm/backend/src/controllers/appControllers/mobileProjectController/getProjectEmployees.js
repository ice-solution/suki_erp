const mongoose = require('mongoose');

/**
 * 獲取項目中分配給該 contractor 的員工列表
 */
const getProjectEmployees = async (req, res) => {
  try {
    const { projectId } = req.params;
    const contractorId = req.contractor._id;

    const Project = mongoose.model('Project');
    const ContractorEmployee = mongoose.model('ContractorEmployee');

    // 查找項目並驗證該 contractor 是否有權限訪問此項目
    const project = await Project.findOne({
      _id: projectId,
      contractors: contractorId,
      removed: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在或您無權限訪問此項目'
      });
    }

    // 從項目的 salaries 中獲取已分配的員工 ID
    const assignedEmployeeIds = project.salaries.map(salary => salary.contractorEmployee);
    
    if (assignedEmployeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        result: {
          project: {
            _id: project._id,
            name: project.name
          },
          employees: []
        },
        message: '此項目暫無分配的員工'
      });
    }

    // 查找這些員工的詳細信息（只查找屬於該 contractor 的員工）
    const employees = await ContractorEmployee.find({
      _id: { $in: assignedEmployeeIds },
      contractor: contractorId,
      removed: false,
      enabled: true
    }).select('name phone email position').sort({ name: 1 });

    return res.status(200).json({
      success: true,
      result: {
        project: {
          _id: project._id,
          name: project.name
        },
        employees
      },
      message: '獲取員工列表成功'
    });

  } catch (error) {
    console.error('獲取項目員工列表失敗:', error);
    return res.status(500).json({
      success: false,
      message: '獲取員工列表失敗: ' + error.message
    });
  }
};

module.exports = getProjectEmployees;

