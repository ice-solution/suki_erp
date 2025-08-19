const express = require('express');
const router = express.Router();
const journalEntryController = require('../controllers/appControllers/journalEntryController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建分錄
router.post('/', adminAuth.isValidAuthToken, journalEntryController.create);

// 獲取分錄列表
router.get('/', adminAuth.isValidAuthToken, journalEntryController.list);

// 獲取單個分錄
router.get('/:id', adminAuth.isValidAuthToken, journalEntryController.read);

// 更新分錄
router.put('/:id', adminAuth.isValidAuthToken, journalEntryController.update);

// 刪除分錄
router.delete('/:id', adminAuth.isValidAuthToken, journalEntryController.delete);

// 過帳分錄
router.patch('/:id/post', adminAuth.isValidAuthToken, journalEntryController.post);

// 沖銷分錄
router.patch('/:id/reverse', adminAuth.isValidAuthToken, journalEntryController.reverse);

// 生成自動分錄
router.post('/generate-auto', adminAuth.isValidAuthToken, journalEntryController.generateAutoEntry);

module.exports = router;
