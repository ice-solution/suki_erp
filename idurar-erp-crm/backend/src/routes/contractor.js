const express = require('express');
const router = express.Router();
const Contractor = require('../models/appModels/Contractor');

// 查詢所有承辦商
router.get('/', async (req, res) => {
  try {
    const contractors = await Contractor.find({ removed: false }).populate('createdBy assigned');
    res.json(contractors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增承辦商
router.post('/', async (req, res) => {
  try {
    const contractor = new Contractor(req.body);
    await contractor.save();
    res.status(201).json(contractor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 查詢單一承辦商
router.get('/:id', async (req, res) => {
  try {
    const contractor = await Contractor.findById(req.params.id).populate('createdBy assigned');
    if (!contractor || contractor.removed) return res.status(404).json({ error: 'Not found' });
    res.json(contractor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新承辦商
router.put('/:id', async (req, res) => {
  try {
    const contractor = await Contractor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contractor) return res.status(404).json({ error: 'Not found' });
    res.json(contractor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 刪除承辦商 (軟刪除)
router.delete('/:id', async (req, res) => {
  try {
    const contractor = await Contractor.findByIdAndUpdate(req.params.id, { removed: true }, { new: true });
    if (!contractor) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 