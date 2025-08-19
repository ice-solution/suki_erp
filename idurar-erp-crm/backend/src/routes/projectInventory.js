const express = require('express');
const router = express.Router();
const projectInventoryController = require('../controllers/appControllers/projectInventoryController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 獲取項目庫存明細
router.get('/project/:projectId/details', adminAuth.isValidAuthToken, projectInventoryController.getProjectInventoryDetails);

module.exports = router;
