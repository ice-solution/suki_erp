const express = require('express');
const router = express.Router();
const financialReportController = require('../controllers/appControllers/financialReportController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 生成損益表
router.get('/profit-loss', adminAuth.isValidAuthToken, financialReportController.generateProfitLossReport);

// 生成資產負債表
router.get('/balance-sheet', adminAuth.isValidAuthToken, financialReportController.generateBalanceSheet);

// 生成試算表
router.get('/trial-balance', adminAuth.isValidAuthToken, financialReportController.generateTrialBalance);

// 生成報表（通用）
router.post('/generate', adminAuth.isValidAuthToken, financialReportController.generateReport);

// 獲取報表列表
router.get('/', adminAuth.isValidAuthToken, financialReportController.list);

// 獲取單個報表
router.get('/:id', adminAuth.isValidAuthToken, financialReportController.read);

module.exports = router;
