const mongoose = require('mongoose');

const SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');
const SupplierQuote = mongoose.model('SupplierQuote');

// GET /ship/bindings?shipId=...
// 回傳該船隻歷史綁定過的 S單編號（supplierQuoteNumber）與 Quote Number（quoteNumber）
const bindings = async (req, res) => {
  try {
    const { shipId } = req.query;
    if (!shipId) {
      return res.status(400).json({
        success: false,
        result: [],
        message: 'shipId is required',
      });
    }

    const bindingRows = await SupplierQuoteAssetBinding.find({
      removed: false,
      assetType: 'ship',
      ship: shipId,
    })
      .sort({ created: -1 })
      .select('_id supplierQuote supplierQuoteNumber quoteNumber created returnDate')
      .lean()
      .exec();

    const boundSupplierQuoteIds = new Set(bindingRows.map((r) => String(r.supplierQuote)));

    // 補查：如果舊資料沒有建立 binding 記錄，但 SupplierQuote 仍然保留 ship 關聯，仍要展示
    const supplierQuoteRows = await SupplierQuote.find({
      removed: false,
      ship: shipId,
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
        returnDate: r.returnDate || null,
      })),
      ...placeholderRows.map((r) => ({ ...r, returnDate: r.returnDate ?? null })),
    ].sort((a, b) => {
      const da = a.created ? new Date(a.created).getTime() : 0;
      const db = b.created ? new Date(b.created).getTime() : 0;
      return db - da;
    });

    const quoteIds = [...new Set(rows.map((r) => r.supplierQuoteId).filter(Boolean).map(String))];
    if (quoteIds.length > 0) {
      const quotes = await SupplierQuote.find({ _id: { $in: quoteIds } })
        .select('address receiver receiptDisplayName')
        .lean()
        .exec();
      const byId = {};
      quotes.forEach((q) => {
        byId[String(q._id)] = q;
      });
      rows.forEach((r) => {
        const q = r.supplierQuoteId ? byId[String(r.supplierQuoteId)] : null;
        if (q) {
          r.projectAddress = q.address != null ? String(q.address) : '';
          r.receiverAddress = q.receiver != null ? String(q.receiver) : '';
          r.receiptDisplayName = q.receiptDisplayName != null ? String(q.receiptDisplayName) : '';
        } else {
          r.projectAddress = '';
          r.receiverAddress = '';
          r.receiptDisplayName = '';
        }
      });
    }

    return res.status(200).json({
      success: true,
      result: rows,
      message: 'Successfully found ship bindings',
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

