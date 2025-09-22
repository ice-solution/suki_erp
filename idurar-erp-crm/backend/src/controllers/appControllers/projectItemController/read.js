const mongoose = require('mongoose');

const Model = mongoose.model('ProjectItem');

const read = async (req, res) => {
  try {
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
    })
    .populate('createdBy', 'name')
    .exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'ProjectItem not found',
      });
    }

    return res.status(200).json({
      success: true,
      result,
      message: 'ProjectItem found successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error reading ProjectItem: ' + error.message,
    });
  }
};

module.exports = read;
