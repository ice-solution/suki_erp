const mongoose = require('mongoose');
const ContractorEmployee = mongoose.model('ContractorEmployee');

const getProfile = async (req, res) => {
  try {
    const employeeId = req.employee._id;

    const employee = await ContractorEmployee.findById(employeeId)
      .populate('contractor')
      .populate('createdBy', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '員工記錄不存在',
      });
    }

    const profileData = {
      _id: employee._id,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      position: employee.position,
      contractor: employee.contractor,
      lastLogin: employee.lastLogin,
      created: employee.created,
      createdBy: employee.createdBy
    };

    return res.status(200).json({
      success: true,
      result: profileData,
      message: '獲取個人資料成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取個人資料失敗: ' + error.message,
    });
  }
};

module.exports = getProfile;
