const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// 手機端員工登入 - 只需手機號碼

const login = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請輸入手機號碼',
      });
    }

    // 查找員工
    const ContractorEmployee = mongoose.model('ContractorEmployee');
    const employee = await ContractorEmployee.findOne({
      phone,
      removed: false,
      enabled: true
    }).populate('contractor');

    if (!employee) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '找不到對應的員工記錄，請確認手機號碼是否正確',
      });
    }

    // 更新最後登入時間
    employee.lastLogin = new Date();
    await employee.save();

    // 生成JWT token
    const payload = {
      employeeId: employee._id,
      phone: employee.phone,
      contractorId: employee.contractor._id,
      type: 'mobile_employee'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d' // 手機端token有效期較長
    });

    // 生成refresh token
    const refreshToken = jwt.sign(
      { employeeId: employee._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '30d' }
    );

    // 返回用戶信息（不包含密碼）
    const employeeData = {
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
      result: {
        employee: employeeData,
        token,
        refreshToken
      },
      message: '登入成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '登入失敗: ' + error.message,
    });
  }
};

module.exports = login;
