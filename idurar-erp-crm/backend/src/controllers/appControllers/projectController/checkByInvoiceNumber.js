const mongoose = require('mongoose');

const Model = mongoose.model('Project');

const checkByInvoiceNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    
    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice Number is required',
      });
    }

    // 查找相同 Invoice Number 的項目
    const project = await Model.findOne({
      invoiceNumber,
      removed: false,
    }).select('_id invoiceNumber description status costBy');

    if (project) {
      return res.status(200).json({
        success: true,
        result: project,
        message: `Found existing project with Invoice Number ${invoiceNumber}`,
      });
    } else {
      return res.status(404).json({
        success: false,
        result: null,
        message: `No project found with Invoice Number ${invoiceNumber}`,
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

module.exports = checkByInvoiceNumber;
