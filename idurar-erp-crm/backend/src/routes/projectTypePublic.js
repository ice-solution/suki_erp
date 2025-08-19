const express = require('express');
const router = express.Router();
const ProjectType = require('../models/appModels/ProjectType');

// 測試路由
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'ProjectType 路由正常工作！',
    timestamp: new Date().toISOString()
  });
});

// 查詢所有項目類型 (公開 API，不需要認證)
router.get('/listAll', async (req, res) => {
  try {
    const projectTypes = await ProjectType.find({ 
      removed: false, 
      enabled: true 
    }).sort({ sortOrder: 1 });
    
    // 返回 IDURAR 標準格式
    res.json({
      success: true,
      result: projectTypes,
      message: `Successfully fetched ${projectTypes.length} project types`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching project types: ' + err.message
    });
  }
});

module.exports = router;
