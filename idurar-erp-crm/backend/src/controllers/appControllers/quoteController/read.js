const mongoose = require('mongoose');

const Model = mongoose.model('Quote');
const { syncConvertedInvoicesOnSourceDoc } = require('@/helpers/syncSourceConvertedInvoices');

const read = async (req, res) => {
  // Find document by id
  let result = await Model.findOne({
    _id: req.params.id,
    removed: false,
  })
    .populate('createdBy', 'name surname email')
    .populate('updatedBy', 'name surname email')
    .exec();
  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  result = await syncConvertedInvoicesOnSourceDoc(Model, result);

  return res.status(200).json({
    success: true,
    result,
    message: 'we found this document ',
  });
};

module.exports = read;
