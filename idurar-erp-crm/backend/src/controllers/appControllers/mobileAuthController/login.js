const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// 手機端承辦商登入 - 支持 username + password 或 phone（向後兼容）

const login = async (req, res) => {
  try {
    const { username, password, phone } = req.body;

    const Contractor = mongoose.model('Contractor');
    let contractor;

    // 優先使用 username + password 登入
    if (username && password) {
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '請輸入用戶名和密碼',
        });
      }

      // 查找承辦商（需要包含密碼字段）
      contractor = await Contractor.findOne({
        username,
        removed: false,
        enabled: true
      }).select('+hashedPassword');

      if (!contractor) {
        return res.status(404).json({
          success: false,
          result: null,
          message: '找不到對應的承辦商記錄，請確認用戶名是否正確',
        });
      }

      // 檢查是否被鎖定
      if (contractor.isLocked) {
        return res.status(423).json({
          success: false,
          result: null,
          message: '帳號已被鎖定，請稍後再試',
        });
      }

      // 驗證密碼
      const isPasswordValid = await contractor.comparePassword(password);
      if (!isPasswordValid) {
        // 增加登入嘗試次數
        await contractor.incLoginAttempts();
        return res.status(401).json({
          success: false,
          result: null,
          message: '密碼錯誤',
        });
      }

      // 重置登入嘗試次數
      await contractor.resetLoginAttempts();

    } else if (phone) {
      // 向後兼容：使用手機號碼登入（不需要密碼）
      contractor = await Contractor.findOne({
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
    } else {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請輸入用戶名和密碼，或手機號碼',
      });
    }

    // 更新最後登入時間（如果還沒有更新）
    if (!contractor.lastLogin || (username && password)) {
      contractor.lastLogin = new Date();
      await contractor.save();
    }

    // 生成JWT token
    const payload = {
      contractorId: contractor._id,
      username: contractor.username,
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
      username: contractor.username,
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
