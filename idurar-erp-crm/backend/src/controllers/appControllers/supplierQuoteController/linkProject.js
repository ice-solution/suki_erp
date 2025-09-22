const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const linkProject = async (req, res) => {
  const { projectId } = req.body;
  
  if (!projectId) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Project ID is required',
    });
  }

  try {
    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      { project: projectId },
      { new: true }
    ).exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Supplier Quote not found',
      });
    }

    return res.status(200).json({
      success: true,
      result,
      message: 'Project linked to supplier quote successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error linking project to supplier quote',
    });
  }
};

module.exports = linkProject;
