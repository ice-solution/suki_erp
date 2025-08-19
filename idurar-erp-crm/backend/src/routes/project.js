const express = require('express');
const router = express.Router();
const Project = require('../models/appModels/Project');

// 查詢所有項目
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ removed: false })
      .populate('contractor projectItems createdBy assigned');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增項目
router.post('/', async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      createdBy: req.admin._id // 自動設置為當前登入用戶
    };
    const project = new Project(projectData);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 查詢單一項目
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('contractor projectItems createdBy assigned');
    if (!project || project.removed) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新項目
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 刪除項目 (軟刪除)
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { removed: true }, { new: true });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 根據狀態查詢項目
router.get('/status/:status', async (req, res) => {
  try {
    const projects = await Project.find({ 
      status: req.params.status, 
      removed: false 
    }).populate('contractor projectItems createdBy assigned');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 根據承辦商查詢項目
router.get('/contractor/:contractorId', async (req, res) => {
  try {
    const projects = await Project.find({ 
      contractor: req.params.contractorId, 
      removed: false 
    }).populate('contractor projectItems createdBy assigned');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 