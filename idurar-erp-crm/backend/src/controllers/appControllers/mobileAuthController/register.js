// 這個功能暫時不需要，員工由管理員創建
const register = async (req, res) => {
  return res.status(403).json({
    success: false,
    result: null,
    message: '員工註冊功能未開放，請聯繫管理員',
  });
};

module.exports = register;
