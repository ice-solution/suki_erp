const mongoose = require('mongoose');

const Model = mongoose.model('Project');

const read = async (req, res) => {
  try {
    // Find document by id with all populated fields
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
    })
      .populate('createdBy', 'name')
      .populate('suppliers', 'name email phone address')
      .populate('contractors', 'name email phone address')
      .populate('quotations')
      .populate('supplierQuotations')
      .populate('shipQuotations')
      .populate('invoices')
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name')
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('onboard.contractorEmployee.contractor', 'name')
      .populate('contractorFees.contractor', 'name')
      .exec();

    // If no results found, return document not found
    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Project not found',
      });
    }

    // Return success response with populated data
    return res.status(200).json({
      success: true,
      result,
      message: 'Project found successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error reading project: ' + error.message,
    });
  }
};

module.exports = read;
