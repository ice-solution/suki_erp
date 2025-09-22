const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const isValidMobileToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        result: null,
        message: '未提供認證token',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.type !== 'mobile_contractor') {
        return res.status(401).json({
          success: false,
          result: null,
          message: '無效的token類型',
        });
      }

      // 查找承辦商
      const Contractor = mongoose.model('Contractor');
      const contractor = await Contractor.findById(decoded.contractorId);

      if (!contractor || contractor.removed || !contractor.enabled) {
        return res.status(401).json({
          success: false,
          result: null,
          message: '承辦商記錄不存在或已停用',
        });
      }

      // 將承辦商信息添加到請求對象
      req.contractor = contractor;
      
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Token無效或已過期',
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '認證失敗: ' + error.message,
    });
  }
};

module.exports = {
  isValidMobileToken,
};
