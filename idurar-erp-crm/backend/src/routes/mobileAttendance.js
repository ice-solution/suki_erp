const express = require('express');
const router = express.Router();
const mobileAttendanceController = require('../controllers/appControllers/mobileAttendanceController');
const mobileAuth = require('../middlewares/mobileAuth');

// 所有路由都需要手機端認證
router.use(mobileAuth.isValidMobileToken);

// 打卡上班
router.post('/clock-in', mobileAttendanceController.clockIn);

// 打卡下班
router.post('/clock-out', mobileAttendanceController.clockOut);

// 獲取今日考勤記錄
router.get('/today', mobileAttendanceController.getTodayAttendance);

module.exports = router;
