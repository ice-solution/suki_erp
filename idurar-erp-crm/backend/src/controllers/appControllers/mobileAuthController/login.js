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

    // 查找承辦商
    const Contractor = mongoose.model('Contractor');
    const contractor = await Contractor.findOne({
      phone,
      removed: false,
      enabled: true
    });

    if (!contractor) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '找不到對應的承辦商記錄，請確認手機號碼是否正確',
      });
    }

    // 更新最後登入時間
    contractor.lastLogin = new Date();
    await contractor.save();

    // 生成JWT token
    const payload = {
      contractorId: contractor._id,
      phone: contractor.phone,
      type: 'mobile_contractor'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d' // 手機端token有效期較長
    });

    // 生成refresh token
    const refreshToken = jwt.sign(
      { contractorId: contractor._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '30d' }
    );

    // 返回承辦商信息
    const contractorData = {
      _id: contractor._id,
      name: contractor.name,
      phone: contractor.phone,
      email: contractor.email,
      address: contractor.address,
      country: contractor.country,
      lastLogin: contractor.lastLogin
    };

    return res.status(200).json({
      success: true,
      result: {
        contractor: contractorData,
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
