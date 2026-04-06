const mongoose = require('mongoose');
const Quote = mongoose.model('Quote');
const Invoice = mongoose.model('Invoice');

/**
 * 營運報告（與前端 /quote/operational-report 對應）
 * Query: startDate, endDate（篩選 Quote / Invoice 的 date）
 */
const getQuoteInvoiceOperationalReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '請提供開始日期和結束日期',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateRange = { $gte: start, $lte: end };

    const populateClients = [
      { path: 'clients', select: 'name' },
      { path: 'client', select: 'name' },
    ];

    // 1) 已接受、指定日期內、從未轉過 Invoice（無 converted.invoices 且無 legacy converted.invoice）
    const acceptedNotInvoiced = await Quote.find({
      removed: false,
      status: 'accepted',
      date: dateRange,
      $and: [
        {
          $or: [
            { 'converted.invoices': { $exists: false } },
            { $expr: { $eq: [{ $size: { $ifNull: ['$converted.invoices', []] } }, 0] } },
          ],
        },
        {
          $or: [
            { 'converted.invoice': { $exists: false } },
            { 'converted.invoice': null },
          ],
        },
      ],
    })
      .populate(populateClients)
      .sort({ year: -1, number: -1 })
      .lean();

    // 2) 已接受、未完成
    const acceptedNotCompleted = await Quote.find({
      removed: false,
      status: 'accepted',
      isCompleted: false,
      date: dateRange,
    })
      .populate(populateClients)
      .sort({ year: -1, number: -1 })
      .lean();

    const invPopulate = [...populateClients];

    // 3a) 未付
    const invoicesUnpaid = await Invoice.find({
      removed: false,
      paymentStatus: 'unpaid',
      date: dateRange,
    })
      .populate(invPopulate)
      .sort({ year: -1, number: -1 })
      .lean();

    // 3b) 已付款、部份付款(credit)≠0、且未勾 Full paid（與 3c 互斥）
    const invoicesPaidPartial = await Invoice.find({
      removed: false,
      paymentStatus: 'paid',
      date: dateRange,
      credit: { $gt: 0 },
      fullPaid: { $ne: true },
    })
      .populate(invPopulate)
      .sort({ year: -1, number: -1 })
      .lean();

    // 3c) 已付款且 Full paid
    const invoicesPaidFullPaid = await Invoice.find({
      removed: false,
      paymentStatus: 'paid',
      fullPaid: true,
      date: dateRange,
    })
      .populate(invPopulate)
      .sort({ year: -1, number: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      result: {
        startDate: start,
        endDate: end,
        summary: {
          acceptedNotInvoiced: acceptedNotInvoiced.length,
          acceptedNotCompleted: acceptedNotCompleted.length,
          invoicesUnpaid: invoicesUnpaid.length,
          invoicesPaidPartial: invoicesPaidPartial.length,
          invoicesPaidFullPaid: invoicesPaidFullPaid.length,
        },
        acceptedNotInvoiced,
        acceptedNotCompleted,
        invoicesUnpaid,
        invoicesPaidPartial,
        invoicesPaidFullPaid,
      },
      message: '報告生成成功',
    });
  } catch (error) {
    console.error('getQuoteInvoiceOperationalReport:', error);
    return res.status(500).json({
      success: false,
      message: '生成報告失敗: ' + error.message,
    });
  }
};

module.exports = getQuoteInvoiceOperationalReport;
