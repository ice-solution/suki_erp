const mongoose = require('mongoose');
const ProjectReturn = mongoose.model('ProjectReturn');

const listByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID is required',
      });
    }

    const returnRecords = await ProjectReturn.find({
      project: projectId,
      removed: false
    })
    .populate([
      'project',
      'items.inventory',
      'createdBy',
      'confirmedBy'
    ])
    .sort({ created: -1 });

    return res.status(200).json({
      success: true,
      result: returnRecords,
      message: `Successfully fetched ${returnRecords.length} return records`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching return records: ' + error.message,
    });
  }
};

module.exports = listByProject;
