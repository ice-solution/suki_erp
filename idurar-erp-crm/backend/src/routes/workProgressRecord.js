const express = require('express');
const router = express.Router();
const workProgressRecordController = require('../controllers/appControllers/workProgressRecordController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建進度記錄
router.post('/', adminAuth.isValidAuthToken, workProgressRecordController.create);

// 獲取單個進度記錄
router.get('/:id', adminAuth.isValidAuthToken, workProgressRecordController.read);

// 更新進度記錄
router.put('/:id', adminAuth.isValidAuthToken, workProgressRecordController.update);

// 刪除進度記錄
router.delete('/:id', adminAuth.isValidAuthToken, workProgressRecordController.delete);

// 根據工序獲取進度記錄
router.get('/work-process/:workProcessId', adminAuth.isValidAuthToken, workProgressRecordController.listByWorkProcess);

// 根據項目獲取進度記錄
router.get('/project/:projectId', adminAuth.isValidAuthToken, workProgressRecordController.listByProject);

// 上傳圖片
router.post('/:recordId/upload-images', adminAuth.isValidAuthToken, workProgressRecordController.uploadImages);

// 審核通過
router.patch('/:id/approve', adminAuth.isValidAuthToken, workProgressRecordController.approve);

// 審核拒絕
router.patch('/:id/reject', adminAuth.isValidAuthToken, workProgressRecordController.reject);

module.exports = router;
