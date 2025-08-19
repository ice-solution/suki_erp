const mongoose = require('mongoose');
const ProjectReturn = mongoose.model('ProjectReturn');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRecord = await ProjectReturn.findOne({
      _id: id,
      removed: false
    }).populate([
      'project',
      'items.inventory',
      'createdBy',
      'confirmedBy'
    ]);

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Return record not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: returnRecord,
      message: 'Successfully fetched return record',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching return record: ' + error.message,
    });
  }
};

module.exports = read;
