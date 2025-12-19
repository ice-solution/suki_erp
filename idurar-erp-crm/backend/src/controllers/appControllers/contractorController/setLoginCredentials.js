const mongoose = require('mongoose');
const Contractor = mongoose.model('Contractor');

/**
 * Admin 設置/更新 Contractor 的登入憑證（用戶名和密碼）
 */
const setLoginCredentials = async (req, res) => {
  try {
    const { contractorId } = req.params;
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: '用戶名為必填字段'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '密碼為必填字段'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密碼長度至少需要6位'
      });
    }

    // 查找 contractor
    const contractor = await Contractor.findById(contractorId);

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: '找不到對應的承辦商記錄'
      });
    }

    // 檢查 username 是否已被其他 contractor 使用
    if (username !== contractor.username) {
      const existingContractor = await Contractor.findOne({
        username,
        _id: { $ne: contractorId },
        removed: false
      });

      if (existingContractor) {
        return res.status(400).json({
          success: false,
          message: '該用戶名已被使用，請選擇其他用戶名'
        });
      }
    }

    // 設置用戶名和密碼
    contractor.username = username;
    await contractor.setPassword(password);
    await contractor.save();

    // 重新查詢（不包含密碼）
    const updatedContractor = await Contractor.findById(contractorId)
      .select('-hashedPassword');

    return res.status(200).json({
      success: true,
      result: updatedContractor,
      message: '登入憑證設置成功'
    });

  } catch (error) {
    console.error('設置登入憑證錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '設置登入憑證失敗: ' + error.message
    });
  }
};

module.exports = setLoginCredentials;

