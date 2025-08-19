const express = require('express');
const router = express.Router();
const mobileAuthController = require('../controllers/appControllers/mobileAuthController');
const mobileAuth = require('../middlewares/mobileAuth');

// 員工登入
router.post('/login', mobileAuthController.login);

// 設置密碼（首次登入）
router.post('/set-password', mobileAuthController.setPassword);

// 刷新token
router.post('/refresh-token', mobileAuthController.refreshToken);

// 需要認證的路由
router.use(mobileAuth.isValidMobileToken);

// 獲取個人資料
router.get('/profile', mobileAuthController.getProfile);

// 更新個人資料
router.put('/profile', mobileAuthController.updateProfile);

module.exports = router;
