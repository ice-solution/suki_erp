const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const progressRecord = await WorkProgressRecord.findOne({
      _id: id,
      removed: false
    }).populate([
      'workProcess',
      'project',
      {
        path: 'submittedBy',
        populate: {
          path: 'employee',
          model: 'ContractorEmployee'
        }
      },
      'reviewedBy'
    ]);

    if (!progressRecord) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Progress record not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: progressRecord,
      message: 'Successfully fetched progress record',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching progress record: ' + error.message,
    });
  }
};

module.exports = read;
