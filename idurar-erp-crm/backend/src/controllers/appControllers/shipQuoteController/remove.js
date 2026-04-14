const mongoose = require('mongoose');
const Model = mongoose.model('ShipQuote');
const { pullDocumentFromProjectArrays } = require('@/helpers/pullDocumentFromProjectArrays');

const remove = async (req, res) => {
  const existing = await Model.findOne({
    _id: req.params.id,
    removed: false,
  }).exec();

  if (!existing) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  await pullDocumentFromProjectArrays(existing._id);

  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    {
      $set: {
        removed: true,
        project: null,
        updated: new Date(),
      },
    },
    { new: true }
  ).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};

module.exports = remove;
