const mongoose = require('mongoose');
const ContractorEmployee = mongoose.model('ContractorEmployee');

const updateProfile = async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const { email, position } = req.body;

    const employee = await ContractorEmployee.findById(employeeId);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '員工記錄不存在',
      });
    }

    // 更新允許修改的欄位
    if (email !== undefined) employee.email = email;
    if (position !== undefined) employee.position = position;

    await employee.save();

    // 填充關聯數據並返回
    await employee.populate('contractor');

    const profileData = {
      _id: employee._id,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      position: employee.position,
      contractor: employee.contractor,
      lastLogin: employee.lastLogin
    };

    return res.status(200).json({
      success: true,
      result: profileData,
      message: '個人資料更新成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '更新個人資料失敗: ' + error.message,
    });
  }
};

module.exports = updateProfile;
