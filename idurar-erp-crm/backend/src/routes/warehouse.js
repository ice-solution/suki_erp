const express = require('express');
const router = express.Router();

// 引入控制器
const list = require('../controllers/appControllers/warehouseController/list');
const create = require('../controllers/appControllers/warehouseController/create');
const read = require('../controllers/appControllers/warehouseController/read');
const update = require('../controllers/appControllers/warehouseController/update');
const deleteItem = require('../controllers/appControllers/warehouseController/delete');
const adjust = require('../controllers/appControllers/warehouseController/adjust');
const transfer = require('../controllers/appControllers/warehouseController/transfer');

// 引入中間件
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 存倉管理路由
router.get('/', adminAuth.isValidAuthToken, list);
router.post('/', adminAuth.isValidAuthToken, create);
router.get('/:id', adminAuth.isValidAuthToken, read);
router.patch('/:id', adminAuth.isValidAuthToken, update);
router.delete('/:id', adminAuth.isValidAuthToken, deleteItem);

// 庫存操作路由
router.post('/:id/adjust', adminAuth.isValidAuthToken, adjust);
router.post('/:id/transfer', adminAuth.isValidAuthToken, transfer);

module.exports = router;
