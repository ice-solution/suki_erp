const mongoose = require('mongoose');

const SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');
const SupplierQuote = mongoose.model('SupplierQuote');

// GET /winch/bindings?winchId=...
// 回傳該爬攬器歷史綁定過的 S單編號（supplierQuoteNumber）與 Quote Number（quoteNumber）
const bindings = async (req, res) => {
  try {
    const { winchId } = req.query;
    if (!winchId) {
      return res.status(400).json({
        success: false,
        result: [],
        message: 'winchId is required',
      });
    }

    const bindingRows = await SupplierQuoteAssetBinding.find({
      removed: false,
      assetType: 'winch',
      winch: winchId,
    })
      .sort({ created: -1 })
      .select('_id supplierQuote supplierQuoteNumber quoteNumber created')
      .lean()
      .exec();

    const boundSupplierQuoteIds = new Set(bindingRows.map((r) => String(r.supplierQuote)));

    // 補查：如果舊資料沒有建立 binding 記錄，但 SupplierQuote 仍然保留 winch 關聯，仍要展示
    const supplierQuoteRows = await SupplierQuote.find({
      removed: false,
      winch: winchId,
      _id: { $nin: Array.from(boundSupplierQuoteIds) },
    })
      .select('numberPrefix number invoiceNumber created date')
      .lean()
      .exec();

    const placeholderRows = supplierQuoteRows.map((sq) => ({
      bindingId: null,
      supplierQuoteId: sq._id,
      supplierQuoteNumber: `${sq.numberPrefix || 'S'}-${sq.number}`,
      quoteNumber: sq.invoiceNumber || '',
      created: sq.created || sq.date || null,
    }));

    const rows = [
      ...bindingRows.map((r) => ({
        bindingId: r._id,
        supplierQuoteId: r.supplierQuote,
        supplierQuoteNumber: r.supplierQuoteNumber,
        quoteNumber: r.quoteNumber || '',
        created: r.created,
      })),
      ...placeholderRows,
    ].sort((a, b) => {
      const da = a.created ? new Date(a.created).getTime() : 0;
      const db = b.created ? new Date(b.created).getTime() : 0;
      return db - da;
    });

    return res.status(200).json({
      success: true,
      result: rows,
      message: 'Successfully found winch bindings',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: [],
      message: err.message || 'Server error',
    });
  }
};

module.exports = bindings;

