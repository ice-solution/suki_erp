const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/appControllers/attendanceController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建考勤記錄
router.post('/', adminAuth.isValidAuthToken, attendanceController.createAttendance);

// 更新考勤記錄
router.put('/:id', adminAuth.isValidAuthToken, attendanceController.updateAttendance);

// 確認考勤記錄
router.patch('/:id/confirm', adminAuth.isValidAuthToken, attendanceController.confirmAttendance);

// 根據項目獲取考勤記錄
router.get('/project/:projectId', adminAuth.isValidAuthToken, attendanceController.getAttendanceByProject);

// 根據項目和日期獲取考勤記錄
router.get('/project/:projectId/date/:date', adminAuth.isValidAuthToken, attendanceController.getAttendanceByDate);

// 生成考勤報告
router.get('/project/:projectId/report', adminAuth.isValidAuthToken, attendanceController.generateAttendanceReport);

module.exports = router;
