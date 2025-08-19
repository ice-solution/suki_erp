const express = require('express');
const router = express.Router();
const mobileProjectController = require('../controllers/appControllers/mobileProjectController');
const mobileAuth = require('../middlewares/mobileAuth');
const { upload, recordProgress } = require('../controllers/appControllers/mobileProjectController/recordProgress');

// 所有路由都需要手機端認證
router.use(mobileAuth.isValidMobileToken);

// 獲取我的項目列表
router.get('/my-projects', mobileProjectController.getMyProjects);

// 獲取項目詳情
router.get('/project/:projectId', mobileProjectController.getProjectDetail);

// 獲取項目工序列表
router.get('/project/:projectId/work-processes', mobileProjectController.getProjectWorkProcesses);

// 記錄進度（支持圖片上傳）
router.post('/record-progress', upload, recordProgress);

// 獲取我的進度記錄
router.get('/my-progress-records', mobileProjectController.getMyProgressRecords);

module.exports = router;
