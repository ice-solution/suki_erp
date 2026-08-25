const mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');
const Client = mongoose.model('Client');
const { parseHongKongDayRange } = require('@/helpers/hongKongMoment');

const getMemberInvoices = async (req, res) => {
  try {
    const { startDate, endDate, clientId } = req.query;

    // 構建日期範圍查詢（香港日曆日）
    const dateQuery = {};
    if (startDate || endDate) {
      const range = parseHongKongDayRange(startDate || endDate, endDate || startDate);
      if (!range) {
        return res.status(400).json({
          success: false,
          message: '日期格式不正確',
        });
      }
      dateQuery.date = {};
      if (startDate) dateQuery.date.$gte = range.from;
      if (endDate) dateQuery.date.$lte = range.to;
    }

    // 構建客戶查詢
    const clientQuery = {};
    if (clientId) {
      clientQuery.client = clientId;
    }

    // 查詢發票
    const invoices = await Invoice.find({
      ...dateQuery,
      ...clientQuery,
      removed: false
    })
    .populate('client', 'name email phone')
    .sort({ date: -1 })
    .lean();

    // 計算統計數據
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const paidInvoices = invoices.filter(invoice => invoice.paymentStatus === 'paid');
    const paidAmount = paidInvoices.reduce((sum, invoice) => sum + (invoice.credit || 0), 0);
    const unpaidAmount = totalAmount - paidAmount;

    // 按客戶分組統計
    const clientStats = {};
    invoices.forEach(invoice => {
      const clientId = invoice.client._id.toString();
      if (!clientStats[clientId]) {
        clientStats[clientId] = {
          client: invoice.client,
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          invoices: []
        };
      }
      
      clientStats[clientId].totalInvoices++;
      clientStats[clientId].totalAmount += invoice.total || 0;
      clientStats[clientId].paidAmount += invoice.credit || 0;
      clientStats[clientId].invoices.push(invoice);
    });

    // 計算未付款金額
    Object.values(clientStats).forEach(client => {
      client.unpaidAmount = client.totalAmount - client.paidAmount;
    });

    const result = {
      summary: {
        totalInvoices,
        totalAmount,
        paidInvoices: paidInvoices.length,
        paidAmount,
        unpaidAmount
      },
      clientStats: Object.values(clientStats),
      invoices: invoices
    };

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully fetched member invoices data',
    });

  } catch (error) {
    console.error('Error in getMemberInvoices:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error: ' + error.message,
    });
  }
};

module.exports = getMemberInvoices;
