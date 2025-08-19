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
      
      if (decoded.type !== 'mobile_employee') {
        return res.status(401).json({
          success: false,
          result: null,
          message: '無效的token類型',
        });
      }

      // 查找員工
      const ContractorEmployee = mongoose.model('ContractorEmployee');
      const employee = await ContractorEmployee.findById(decoded.employeeId)
        .populate('contractor');

      if (!employee || employee.removed || !employee.isActive) {
        return res.status(401).json({
          success: false,
          result: null,
          message: '員工記錄不存在或已停用',
        });
      }

      // 檢查是否被鎖定
      if (employee.isLocked) {
        return res.status(423).json({
          success: false,
          result: null,
          message: '帳戶已被鎖定',
        });
      }

      // 將員工信息添加到請求對象
      req.employee = employee;
      req.contractor = employee.contractor;
      
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
