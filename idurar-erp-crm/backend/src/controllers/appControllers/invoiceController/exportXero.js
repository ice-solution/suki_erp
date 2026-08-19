const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');

function parseLocalDayRange(dateFrom, dateTo) {
  const parseLocalDay = (s, endOfDay) => {
    const parts = String(s || '')
      .slice(0, 10)
      .split('-')
      .map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  };

  const from = parseLocalDay(dateFrom, false);
  const to = parseLocalDay(dateTo, true);
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

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
    const range = parseLocalDayRange(dateFrom, dateTo);
    if (!range) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid date format',
      });
    }
    const { from, to } = range;

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
