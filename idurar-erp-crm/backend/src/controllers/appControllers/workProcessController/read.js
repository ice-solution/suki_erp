const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const workProcess = await WorkProcess.findOne({
      _id: id,
      removed: false
    }).populate([
      'project',
      {
        path: 'assignedTo',
        populate: {
          path: 'employee',
          model: 'ContractorEmployee'
        }
      },
      'dependencies',
      'createdBy'
    ]);

    if (!workProcess) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Work process not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: workProcess,
      message: 'Successfully fetched work process',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching work process: ' + error.message,
    });
  }
};

module.exports = read;
