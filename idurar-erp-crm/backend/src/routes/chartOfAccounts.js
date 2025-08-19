const express = require('express');
const router = express.Router();
const chartOfAccountsController = require('../controllers/appControllers/chartOfAccountsController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 創建科目
router.post('/', adminAuth.isValidAuthToken, chartOfAccountsController.create);

// 創建預設科目表
router.post('/create-default', adminAuth.isValidAuthToken, chartOfAccountsController.createDefaultChart);

// 獲取科目列表
router.get('/', adminAuth.isValidAuthToken, chartOfAccountsController.list);

// 兼容列表端點（避免被 `/:id` 誤匹配）
router.get('/list', adminAuth.isValidAuthToken, chartOfAccountsController.list);
router.get('/listAll', adminAuth.isValidAuthToken, chartOfAccountsController.list);

// 搜索科目 - 必須在 /:id 路由之前
router.get('/search', adminAuth.isValidAuthToken, chartOfAccountsController.search);

// 獲取科目階層 - 必須在 /:id 路由之前
router.get('/hierarchy', adminAuth.isValidAuthToken, chartOfAccountsController.getAccountHierarchy);

// 獲取科目餘額 - 必須在 /:id 路由之前
router.get('/:id/balance', adminAuth.isValidAuthToken, chartOfAccountsController.getAccountBalance);

// 獲取單個科目 - 必須在所有具體路由之後
router.get('/:id', adminAuth.isValidAuthToken, chartOfAccountsController.read);

// 更新科目
router.put('/:id', adminAuth.isValidAuthToken, chartOfAccountsController.update);

// 刪除科目
router.delete('/:id', adminAuth.isValidAuthToken, chartOfAccountsController.delete);

module.exports = router;
