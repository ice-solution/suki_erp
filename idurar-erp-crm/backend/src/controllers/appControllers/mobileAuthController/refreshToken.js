const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ContractorEmployee = mongoose.model('ContractorEmployee');

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請提供refresh token',
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          result: null,
          message: '無效的refresh token',
        });
      }

      // 查找員工
      const employee = await ContractorEmployee.findById(decoded.employeeId)
        .populate('contractor');

      if (!employee || employee.removed || !employee.isActive) {
        return res.status(401).json({
          success: false,
          result: null,
          message: '員工記錄不存在或已停用',
        });
      }

      // 生成新的access token
      const payload = {
        employeeId: employee._id,
        phone: employee.phone,
        contractorId: employee.contractor._id,
        type: 'mobile_employee'
      };

      const newToken = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '7d'
      });

      return res.status(200).json({
        success: true,
        result: {
          token: newToken
        },
        message: 'Token刷新成功',
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Refresh token無效或已過期',
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '刷新token失敗: ' + error.message,
    });
  }
};

module.exports = refreshToken;
