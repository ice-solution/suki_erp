const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');

/**
 * GET /invoice/export-xero?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * 依發票 date 篩選日期範圍，回傳用於 Xero CSV 滙出的發票列表（含 client/clients 以取得客戶名與 accountCode）
 */
const exportXero = async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'dateFrom and dateTo are required (YYYY-MM-DD)',
      });
    }
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid date format',
      });
    }
    // 當日結束時間
    to.setHours(23, 59, 59, 999);

    const result = await Model.find({
      removed: false,
      date: { $gte: from, $lte: to },
    })
      .populate('client', 'name email accountCode')
      .populate('clients', 'name email accountCode')
      .populate('project', 'name address')
      .sort({ date: 1, number: 1 })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found invoices for Xero export',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Server error',
    });
  }
};

module.exports = exportXero;
