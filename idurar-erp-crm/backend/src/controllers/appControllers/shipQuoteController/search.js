const mongoose = require('mongoose');

const Model = mongoose.model('ShipQuote');

const search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    const escapeRegex = (str) =>
      String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const escaped = escapeRegex(q);

    // 支援完整號碼輸入，例如：SML-47413
    // - "SML-47413" => numberPrefix ~ SML AND number = 47413
    // - "SML" => numberPrefix contains SML
    // - "47413" => number contains 47413
    const match = {
      removed: false,
      type: '吊船', // 只搜索吊船類型
      $or: [
        { invoiceNumber: { $regex: new RegExp(escaped, 'i') } },
        { number: { $regex: new RegExp(escaped, 'i') } },
        { numberPrefix: { $regex: new RegExp(escaped, 'i') } },
      ],
    };

    if (q.includes('-')) {
      const [prefixPart, numberPart] = q.split('-');
      const p = (prefixPart || '').trim();
      const n = (numberPart || '').trim();
      if (p && n) {
        match.$or.unshift({
          $and: [
            { numberPrefix: { $regex: new RegExp(escapeRegex(p), 'i') } },
            { number: n },
          ],
        });
      }
    }

    const result = await Model.find(match)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('numberPrefix number invoiceNumber isCompleted address poNumber costPrice')
      .exec();

    if (result.length >= 1) {
      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'No document found',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = search;









