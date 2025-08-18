const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const InventoryRecord = require('../models/InventoryRecord');

// ===== Inventory CRUD =====
// 建立倉存
router.post('/', async (req, res) => {
  try {
    const inventory = new Inventory(req.body);
    await inventory.save();
    res.status(201).json(inventory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 查詢所有倉存
router.get('/', async (req, res) => {
  try {
    const inventories = await Inventory.find();
    res.json(inventories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢單一倉存
router.get('/:id', async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) return res.status(404).json({ error: 'Not found' });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新倉存
router.put('/:id', async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!inventory) return res.status(404).json({ error: 'Not found' });
    res.json(inventory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 刪除倉存
router.delete('/:id', async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Inventory Record =====
// 新增倉存記錄
router.post('/record', async (req, res) => {
  try {
    const recordData = {
      ...req.body,
      owner: req.user._id // 取自登入用戶
    };
    const record = new InventoryRecord(recordData);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 查詢所有倉存記錄
router.get('/record', async (req, res) => {
  try {
    const records = await InventoryRecord.find().populate('item');
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 