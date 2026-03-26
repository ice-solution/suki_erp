const mongoose = require('mongoose');

const Model = mongoose.model('Ship');
const SupplierQuote = mongoose.model('SupplierQuote');
const SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');

// 當船隻狀態改為回倉/待回廠時，清掉 expiredDate / supplierNumber，避免顯示已無關的到期日
const updateShip = async (req, res) => {
  req.body.removed = false;
  const now = new Date();
  req.body.modified_at = now;
  req.body.updated = now;

  if (req.admin && req.admin._id) {
    req.body.updatedBy = req.admin._id;
  }

  const returnedStatuses = ['returned_warehouse_cn', 'returned_warehouse_hk'];
  if (req.body.status && returnedStatuses.includes(req.body.status)) {
    const shipId = req.params.id;
    const returnDateValue = req.body.returnDate;
    const parsedReturnDate = returnDateValue ? new Date(returnDateValue) : null;
    if (!parsedReturnDate || Number.isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '狀態為待回廠/香港倉時必須填寫回廠日期',
      });
    }

    // 先抓出所有仍綁定到此船的 S單，做「歷史記錄」並解除關聯
    const supplierQuotes = await SupplierQuote.find({
      removed: false,
      ship: shipId,
    })
      .select('numberPrefix number invoiceNumber created date')
      .lean()
      .exec();

    if (supplierQuotes.length > 0) {
      const supplierQuoteIds = supplierQuotes.map((sq) => sq._id);
      const existingBindings = await SupplierQuoteAssetBinding.find({
        removed: false,
        assetType: 'ship',
        ship: shipId,
        supplierQuote: { $in: supplierQuoteIds },
      })
        .select('supplierQuote')
        .lean()
        .exec();

      const existingSet = new Set(existingBindings.map((b) => String(b.supplierQuote)));

      const createPayloads = supplierQuotes
        .filter((sq) => !existingSet.has(String(sq._id)))
        .map((sq) => {
          const supplierQuoteNumber = `${sq.numberPrefix || 'S'}-${sq.number}`;
          return {
            assetType: 'ship',
            ship: shipId,
            supplierQuote: sq._id,
            supplierQuoteNumber,
            quoteNumber: sq.invoiceNumber || '',
            createdBy: req.admin && req.admin._id ? req.admin._id : undefined,
            created: sq.created || sq.date || now,
            returnDate: parsedReturnDate,
          };
        });

      if (createPayloads.length > 0) {
        // bulk insert 可以大幅減少多次 create 的開銷
        await SupplierQuoteAssetBinding.insertMany(createPayloads);
      }

      // 既有綁定補寫回廠日期（只更新尚未寫入 returnDate 的記錄）
      await SupplierQuoteAssetBinding.updateMany(
        {
          removed: false,
          assetType: 'ship',
          ship: shipId,
          supplierQuote: { $in: supplierQuoteIds },
          $or: [{ returnDate: null }, { returnDate: { $exists: false } }],
        },
        { $set: { returnDate: parsedReturnDate } }
      );

      // 解除關聯：把此船從所有 S單的 ship 欄位清掉
      const updatePayload = {
        ship: null,
        modified_at: now,
        updated: now,
      };
      if (req.admin && req.admin._id) updatePayload.updatedBy = req.admin._id;

      await SupplierQuote.updateMany(
        { removed: false, ship: shipId },
        { $set: updatePayload }
      );
    }

    req.body.expiredDate = null;
    req.body.supplierNumber = null;
    req.body.assigned = null;
    req.body.returnDate = parsedReturnDate;
  }

  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document',
  });
};

module.exports = updateShip;

