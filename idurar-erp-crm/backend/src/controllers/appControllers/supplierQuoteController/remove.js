const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');
const { applySupplierQuoteMaterialsWarehouseSync } = require('@/helpers/supplierQuoteMaterialsWarehouseSync');
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

  const oldMaterials = existing.materials || [];

  // 先退回倉庫（失敗則不刪除、不斷專案）
  try {
    await applySupplierQuoteMaterialsWarehouseSync({
      oldMaterials,
      newMaterials: [],
      supplierQuoteId: existing._id,
      adminId: req.admin && req.admin._id,
    });
  } catch (syncErr) {
    return res.status(400).json({
      success: false,
      result: null,
      message: syncErr.message || '退回倉庫失敗，無法刪除 S 單',
    });
  }

  await pullDocumentFromProjectArrays(existing._id);

  const result = await Model.findOneAndUpdate(
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
    }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};

module.exports = remove;
