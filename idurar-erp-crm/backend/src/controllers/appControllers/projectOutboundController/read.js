const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const outboundRecord = await ProjectOutbound.findOne({
      _id: id,
      removed: false
    }).populate([
      'project',
      'items.inventory',
      'createdBy',
      'confirmedBy'
    ]);

    if (!outboundRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Outbound record not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: outboundRecord,
      message: 'Successfully fetched outbound record',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching outbound record: ' + error.message,
    });
  }
};

module.exports = read;
