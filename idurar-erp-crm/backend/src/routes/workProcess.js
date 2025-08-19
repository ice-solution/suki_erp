const express = require('express');
const router = express.Router();
const workProcessController = require('../controllers/appControllers/workProcessController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建工序
router.post('/', adminAuth.isValidAuthToken, workProcessController.create);

// 獲取單個工序
router.get('/:id', adminAuth.isValidAuthToken, workProcessController.read);

// 更新工序
router.put('/:id', adminAuth.isValidAuthToken, workProcessController.update);

// 刪除工序
router.delete('/:id', adminAuth.isValidAuthToken, workProcessController.delete);

// 根據項目獲取工序列表
router.get('/project/:projectId', adminAuth.isValidAuthToken, workProcessController.listByProject);

// 更新工序進度
router.patch('/:id/progress', adminAuth.isValidAuthToken, workProcessController.updateProgress);

// 獲取項目進度表
router.get('/project/:projectId/schedule', adminAuth.isValidAuthToken, workProcessController.getProjectSchedule);

module.exports = router;
