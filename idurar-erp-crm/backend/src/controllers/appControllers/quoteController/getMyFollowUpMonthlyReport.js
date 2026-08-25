const mongoose = require('mongoose');

const Quote = mongoose.model('Quote');
const ShipQuote = mongoose.model('ShipQuote');
const SupplierQuote = mongoose.model('SupplierQuote');
const Invoice = mongoose.model('Invoice');
const { parseHongKongDayRange } = require('@/helpers/hongKongMoment');

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

    const range = parseHongKongDayRange(startDate, endDate);
    if (!range) {
      return res.status(400).json({
        success: false,
        message: '日期格式不正確',
      });
    }
    const { from: start, to: end } = range;

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
      date: { $gte: start, $lte: end },
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
        startDate: start,
        endDate: end,
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
