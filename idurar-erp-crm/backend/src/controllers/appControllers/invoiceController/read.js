const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const read = async (req, res) => {
  try {
    // 驗證ID格式
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid ID format',
      });
    }

    // Find document by id
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
    })
      .populate('createdBy', 'name')
      .populate('client', 'name email phone address')
      .populate('revenueAccount', 'accountCode accountName')
      .populate('receivableAccount', 'accountCode accountName')
      .populate('project', 'orderNumber projectName')
      .populate('payment', 'number date amount currency paymentMode ref description')
      .exec();

    // If no results found, return document not found
    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No document found',
      });
    } else {
      // Return success response
      return res.status(200).json({
        success: true,
        result,
        message: 'Document found successfully',
      });
    }
  } catch (error) {
    console.error('Error in invoice read controller:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error: ' + error.message,
    });
  }
};

module.exports = read;
