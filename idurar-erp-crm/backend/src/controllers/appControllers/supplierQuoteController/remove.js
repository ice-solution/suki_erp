const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');
const { applySupplierQuoteMaterialsWarehouseSync } = require('@/helpers/supplierQuoteMaterialsWarehouseSync');

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

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  // 刪除 S 單：材料用量退回倉庫（與「從 S 單移除材料」同邏輯）
  try {
    await applySupplierQuoteMaterialsWarehouseSync({
      oldMaterials,
      newMaterials: [],
      supplierQuoteId: existing._id,
      adminId: req.admin && req.admin._id,
    });
  } catch (syncErr) {
    await Model.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { removed: false } }
    ).exec();
    return res.status(400).json({
      success: false,
      result: null,
      message: syncErr.message || '退回倉庫失敗，無法刪除 S 單',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};

module.exports = remove;
