const express = require('express');
const router = express.Router();

const adminAuth = require('../controllers/coreControllers/adminAuth');
const accountingController = require('../controllers/appControllers/accountingController');

// 獲取會員發票統計
router.get('/member-invoices', adminAuth.isValidAuthToken, accountingController.getMemberInvoices);

module.exports = router;
