const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const ModelPayment = mongoose.model('Payment');
const { pullDocumentFromProjectArrays } = require('@/helpers/pullDocumentFromProjectArrays');
const { syncConvertedInvoicesForDeletedInvoice } = require('@/helpers/syncSourceConvertedInvoices');

const remove = async (req, res) => {
  const existing = await Model.findOne({
    _id: req.params.id,
    removed: false,
  }).exec();

  if (!existing) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  await pullDocumentFromProjectArrays(existing._id);

  const deletedInvoice = await Model.findOneAndUpdate(
    {
      _id: req.params.id,
      removed: false,
    },
    {
      $set: {
        removed: true,
        project: null,
        updated: new Date(),
      },
    },
    { new: true }
  ).exec();

  await ModelPayment.updateMany(
    { invoice: deletedInvoice._id },
    { $set: { removed: true } }
  );

  await syncConvertedInvoicesForDeletedInvoice(existing);

  return res.status(200).json({
    success: true,
    result: deletedInvoice,
    message: 'Invoice deleted successfully',
  });
};

module.exports = remove;
