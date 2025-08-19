const express = require('express');
const router = express.Router();
const projectOutboundController = require('../controllers/appControllers/projectOutboundController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建出庫記錄
router.post('/', adminAuth.isValidAuthToken, projectOutboundController.create);

// 根據項目ID獲取出庫記錄
router.get('/project/:projectId', adminAuth.isValidAuthToken, projectOutboundController.listByProject);

// 獲取單個出庫記錄
router.get('/:id', adminAuth.isValidAuthToken, projectOutboundController.read);

// 更新出庫記錄
router.put('/:id', adminAuth.isValidAuthToken, projectOutboundController.update);

// 確認出庫（扣減庫存）
router.patch('/:id/confirm', adminAuth.isValidAuthToken, projectOutboundController.confirm);

// 刪除出庫記錄
router.delete('/:id', adminAuth.isValidAuthToken, projectOutboundController.delete);

module.exports = router;
