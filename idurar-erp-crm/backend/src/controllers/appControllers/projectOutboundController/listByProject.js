const mongoose = require('mongoose');
const ProjectOutbound = mongoose.model('ProjectOutbound');

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

    const outboundRecords = await ProjectOutbound.find({
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
      result: outboundRecords,
      message: `Successfully fetched ${outboundRecords.length} outbound records`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching outbound records: ' + error.message,
    });
  }
};

module.exports = listByProject;
