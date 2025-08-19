const express = require('express');
const router = express.Router();
const projectReturnController = require('../controllers/appControllers/projectReturnController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建退回記錄
router.post('/', adminAuth.isValidAuthToken, projectReturnController.create);

// 根據項目ID獲取退回記錄
router.get('/project/:projectId', adminAuth.isValidAuthToken, projectReturnController.listByProject);

// 獲取單個退回記錄
router.get('/:id', adminAuth.isValidAuthToken, projectReturnController.read);

// 更新退回記錄
router.put('/:id', adminAuth.isValidAuthToken, projectReturnController.update);

// 確認退回（增加庫存）
router.patch('/:id/confirm', adminAuth.isValidAuthToken, projectReturnController.confirm);

// 刪除退回記錄
router.delete('/:id', adminAuth.isValidAuthToken, projectReturnController.delete);

module.exports = router;
