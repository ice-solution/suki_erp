const mongoose = require('mongoose');

const Quote = mongoose.model('Quote');
const ShipQuote = mongoose.model('ShipQuote');
const SupplierQuote = mongoose.model('SupplierQuote');
const Invoice = mongoose.model('Invoice');

function parseLocalDayRange(startDate, endDate) {
  const parseLocalDay = (s, endOfDay) => {
    const parts = String(s || '')
      .slice(0, 10)
      .split('-')
      .map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  };

  const start = parseLocalDay(startDate, false);
  const end = parseLocalDay(endDate, true);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

const populateClients = [
  { path: 'clients', select: 'name' },
  { path: 'client', select: 'name' },
];

const populateCreators = [
  { path: 'createdBy', select: 'name email' },
  { path: 'followUpBy', select: 'name surname email' },
  { path: 'updatedBy', select: 'name email' },
];

const getMyFollowUpMonthlyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '請提供開始日期和結束日期',
      });
    }

    const range = parseLocalDayRange(startDate, endDate);
    if (!range) {
      return res.status(400).json({
        success: false,
        message: '日期格式不正確',
      });
    }

    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '未登入或登入已失效',
      });
    }

    const adminOid = new mongoose.Types.ObjectId(String(adminId));
    const matchMine = {
      $or: [{ followUpBy: adminOid }, { createdBy: adminOid }],
    };
    const baseMatch = {
      removed: false,
      date: { $gte: range.start, $lte: range.end },
      ...matchMine,
    };

    const commonPopulate = [...populateClients, ...populateCreators];

    const [quotes, shipQuotes, supplierQuotes, invoices] = await Promise.all([
      Quote.find(baseMatch).populate(commonPopulate).sort({ year: -1, number: -1 }).lean(),
      ShipQuote.find(baseMatch).populate(commonPopulate).sort({ year: -1, number: -1 }).lean(),
      SupplierQuote.find(baseMatch).populate(commonPopulate).sort({ year: -1, number: -1 }).lean(),
      Invoice.find(baseMatch).populate(commonPopulate).sort({ year: -1, number: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      result: {
        startDate: range.start,
        endDate: range.end,
        summary: {
          quotes: quotes.length,
          shipQuotes: shipQuotes.length,
          supplierQuotes: supplierQuotes.length,
          invoices: invoices.length,
          total: quotes.length + shipQuotes.length + supplierQuotes.length + invoices.length,
        },
        quotes,
        shipQuotes,
        supplierQuotes,
        invoices,
      },
      message: '個人跟單報告生成成功',
    });
  } catch (error) {
    console.error('getMyFollowUpMonthlyReport:', error);
    return res.status(500).json({
      success: false,
      message: '生成個人跟單報告失敗: ' + error.message,
    });
  }
};

module.exports = getMyFollowUpMonthlyReport;
