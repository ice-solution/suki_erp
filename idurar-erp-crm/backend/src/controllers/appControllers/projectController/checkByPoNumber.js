const mongoose = require('mongoose');

const Model = mongoose.model('Project');

const checkByPoNumber = async (req, res) => {
  try {
    const { poNumber } = req.params;
    
    if (!poNumber) {
      return res.status(400).json({
        success: false,
        message: 'P.O Number is required',
      });
    }

    // 查找相同P.O Number的項目
    const project = await Model.findOne({
      poNumber: poNumber,
      removed: false,
    }).select('_id poNumber description status costBy');

    if (project) {
      return res.status(200).json({
        success: true,
        result: project,
        message: `Found existing project with P.O Number ${poNumber}`,
      });
    } else {
      return res.status(404).json({
        success: false,
        result: null,
        message: `No project found with P.O Number ${poNumber}`,
      });
    }

  } catch (error) {
    console.error('Check project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking project',
      error: error.message,
    });
  }
};

module.exports = checkByPoNumber;
