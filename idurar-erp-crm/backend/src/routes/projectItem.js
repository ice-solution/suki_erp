const express = require('express');
const router = express.Router();
const ProjectItem = require('../models/ProjectItem');

// 查詢所有工程項目
router.get('/', async (req, res) => {
  try {
    const items = await ProjectItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增工程項目
router.post('/', async (req, res) => {
  try {
    const item = new ProjectItem(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 查詢單一工程項目
router.get('/:id', async (req, res) => {
  try {
    const item = await ProjectItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新工程項目
router.put('/:id', async (req, res) => {
  try {
    const item = await ProjectItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 刪除工程項目
router.delete('/:id', async (req, res) => {
  try {
    const item = await ProjectItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 