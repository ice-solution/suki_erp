const mongoose = require('mongoose');
const ProjectEmployee = mongoose.model('ProjectEmployee');

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

    const projectEmployees = await ProjectEmployee.find({
      project: projectId,
      removed: false
    })
    .populate(['project', 'employee', 'createdBy'])
    .sort({ created: -1 });

    return res.status(200).json({
      success: true,
      result: projectEmployees,
      message: `Successfully fetched ${projectEmployees.length} project employees`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching project employees: ' + error.message,
    });
  }
};

module.exports = listByProject;
