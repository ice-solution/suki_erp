const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

const linkProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { project } = req.body;
    
    // 驗證輸入
    if (!project) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID is required',
      });
    }
    
    // 更新報價單的項目關聯
    const result = await Model.findOneAndUpdate(
      { _id: id, removed: false },
      { project: project },
      { new: true }
    ).populate('client project').exec();
    
    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      result,
      message: 'Quote linked to project successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error linking quote to project: ' + error.message,
    });
  }
};

module.exports = linkProject;
