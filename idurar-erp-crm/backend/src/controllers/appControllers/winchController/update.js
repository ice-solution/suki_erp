const mongoose = require('mongoose');

const Model = mongoose.model('Winch');
const SupplierQuote = mongoose.model('SupplierQuote');
const SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');

// 當爬攬器狀態改為回倉/待回廠時，清掉 expiredDate / supplierNumber，避免顯示已無關的到期日
const updateWinch = async (req, res) => {
  req.body.removed = false;
  const now = new Date();
  req.body.modified_at = now;
  req.body.updated = now;

  if (req.admin && req.admin._id) {
    req.body.updatedBy = req.admin._id;
  }

  const returnedStatuses = ['returned_warehouse_cn', 'returned_warehouse_hk'];
  if (req.body.status && returnedStatuses.includes(req.body.status)) {
    const winchId = req.params.id;
    const returnDateValue = req.body.returnDate;
    const parsedReturnDate = returnDateValue ? new Date(returnDateValue) : null;
    if (!parsedReturnDate || Number.isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '狀態為待回廠/香港倉時必須填寫回廠日期',
      });
    }

    // 先抓出所有仍綁定到此爬攬器的 S單，做「歷史記錄」並解除關聯
    const supplierQuotes = await SupplierQuote.find({
      removed: false,
      winch: winchId,
    })
      .select('numberPrefix number invoiceNumber created date')
      .lean()
      .exec();

    if (supplierQuotes.length > 0) {
      const supplierQuoteIds = supplierQuotes.map((sq) => sq._id);
      const existingBindings = await SupplierQuoteAssetBinding.find({
        removed: false,
        assetType: 'winch',
        winch: winchId,
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
            assetType: 'winch',
            winch: winchId,
            supplierQuote: sq._id,
            supplierQuoteNumber,
            quoteNumber: sq.invoiceNumber || '',
            createdBy: req.admin && req.admin._id ? req.admin._id : undefined,
            created: sq.created || sq.date || now,
            returnDate: parsedReturnDate,
          };
        });

      if (createPayloads.length > 0) {
        await SupplierQuoteAssetBinding.insertMany(createPayloads);
      }

      // 既有綁定補寫回廠日期（只更新尚未寫入 returnDate 的記錄）
      await SupplierQuoteAssetBinding.updateMany(
        {
          removed: false,
          assetType: 'winch',
          winch: winchId,
          supplierQuote: { $in: supplierQuoteIds },
          $or: [{ returnDate: null }, { returnDate: { $exists: false } }],
        },
        { $set: { returnDate: parsedReturnDate } }
      );

      // 解除關聯：把此爬攬器從所有 S單的 winch 欄位清掉
      const updatePayload = {
        winch: null,
        modified_at: now,
        updated: now,
      };
      if (req.admin && req.admin._id) updatePayload.updatedBy = req.admin._id;

      await SupplierQuote.updateMany(
        { removed: false, winch: winchId },
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

module.exports = updateWinch;

