const mongoose = require('mongoose');
const ContractorEmployee = mongoose.model('ContractorEmployee');

const setPassword = async (req, res) => {
  try {
    const { phone, newPassword, confirmPassword } = req.body;

    if (!phone || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請輸入手機號碼、新密碼和確認密碼',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '新密碼和確認密碼不一致',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '密碼長度至少需要6位',
      });
    }

    // 查找員工
    const employee = await ContractorEmployee.findOne({
      phone,
      removed: false,
      isActive: true
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '找不到對應的員工記錄',
      });
    }

    // 設置新密碼
    await employee.setPassword(newPassword);
    await employee.save();

    return res.status(200).json({
      success: true,
      result: {
        phone: employee.phone,
        name: employee.name
      },
      message: '密碼設置成功，現在可以登入了',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '設置密碼失敗: ' + error.message,
    });
  }
};

module.exports = setPassword;
