const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const remove = async (req, res) => {
  // Find the document by id and delete it
  const result = await Model.findOneAndUpdate(
    {
      _id: req.params.id,
      removed: false,
    },
    {
      $set: {
        removed: true,
      },
    }
  ).exec();
  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  } else {
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully Deleted the document ',
    });
  }
};

module.exports = remove;
