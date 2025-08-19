const express = require('express');
const router = express.Router();
const projectEmployeeController = require('../controllers/appControllers/projectEmployeeController');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 添加員工到項目
router.post('/', adminAuth.isValidAuthToken, projectEmployeeController.addEmployee);

// 根據項目ID獲取員工列表
router.get('/project/:projectId', adminAuth.isValidAuthToken, projectEmployeeController.listByProject);

// 更新項目員工信息
router.put('/:id', adminAuth.isValidAuthToken, projectEmployeeController.updateEmployee);

// 從項目中移除員工
router.patch('/:id/remove', adminAuth.isValidAuthToken, projectEmployeeController.removeEmployee);

module.exports = router;
