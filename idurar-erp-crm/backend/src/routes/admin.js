const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Admin = mongoose.model('Admin');

// 查詢所有管理員
router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find({}, '-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增管理員
router.post('/', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const admin = new Admin({ email, name, role });
    await admin.save();
    res.status(201).json(admin);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 編輯管理員
router.put('/:id', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const admin = await Admin.findByIdAndUpdate(req.params.id, { email, name, role }, { new: true });
    if (!admin) return res.status(404).json({ error: 'Not found' });
    res.json(admin);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 刪除管理員
router.delete('/:id', async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 