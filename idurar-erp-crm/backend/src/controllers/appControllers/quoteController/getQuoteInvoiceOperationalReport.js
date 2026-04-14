const mongoose = require('mongoose');
const Quote = mongoose.model('Quote');
const Invoice = mongoose.model('Invoice');

/**
 * 營運報告（與前端 /quote/operational-report 對應）
 * Query: startDate, endDate（篩選 Quote / Invoice 的 date）
 */
const getQuoteInvoiceOperationalReport = async (req, res) => {
  try {
    const { startDate, endDate, creatorId, clientId } = req.query;

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

    const populateCreators = [
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' },
    ];

    const baseMatch = { removed: false, date: dateRange };
    const andFilters = [];

    if (clientId) {
      const cid = new mongoose.Types.ObjectId(String(clientId));
      andFilters.push({ $or: [{ clients: cid }, { client: cid }] });
    }
    if (creatorId) {
      const aid = new mongoose.Types.ObjectId(String(creatorId));
      andFilters.push({ $or: [{ createdBy: aid }, { updatedBy: aid }] });
    }

    // 1) 已接受、指定日期內、從未轉過 Invoice（無 converted.invoices 且無 legacy converted.invoice）
    const acceptedNotInvoicedAnd = [
      ...andFilters,
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
    ];
    const acceptedNotInvoiced = await Quote.find({
      ...baseMatch,
      status: 'accepted',
      ...(acceptedNotInvoicedAnd.length ? { $and: acceptedNotInvoicedAnd } : {}),
    })
      .populate([...populateClients, ...populateCreators])
      .sort({ year: -1, number: -1 })
      .lean();

    // 2) 已接受、未完成
    const acceptedNotCompleted = await Quote.find({
      ...baseMatch,
      status: 'accepted',
      isCompleted: false,
      ...(andFilters.length ? { $and: andFilters } : {}),
    })
      .populate([...populateClients, ...populateCreators])
      .sort({ year: -1, number: -1 })
      .lean();

    // 2a) 已發送（sent）
    const sentQuotes = await Quote.find({
      ...baseMatch,
      status: 'sent',
      ...(andFilters.length ? { $and: andFilters } : {}),
    })
      .populate([...populateClients, ...populateCreators])
      .sort({ year: -1, number: -1 })
      .lean();

    // 2b) 待處理（pending）
    const pendingQuotes = await Quote.find({
      ...baseMatch,
      status: 'pending',
      ...(andFilters.length ? { $and: andFilters } : {}),
    })
      .populate([...populateClients, ...populateCreators])
      .sort({ year: -1, number: -1 })
      .lean();

    const invPopulate = [...populateClients, ...populateCreators];

    // 3a) 未付
    const invoicesUnpaid = await Invoice.find({
      ...baseMatch,
      paymentStatus: 'unpaid',
      ...(andFilters.length ? { $and: andFilters } : {}),
    })
      .populate(invPopulate)
      .sort({ year: -1, number: -1 })
      .lean();

    // 3b) 已付款、部份付款(credit)≠0、且未勾 Full paid（與 3c 互斥）
    const invoicesPaidPartial = await Invoice.find({
      ...baseMatch,
      paymentStatus: 'paid',
      credit: { $gt: 0 },
      fullPaid: { $ne: true },
      ...(andFilters.length ? { $and: andFilters } : {}),
    })
      .populate(invPopulate)
      .sort({ year: -1, number: -1 })
      .lean();

    // 3c) 已勾 Full paid（以 fullPaid 為準；避免 fullPaid=true 但 paymentStatus 未同步時漏掉）
    const invoicesPaidFullPaid = await Invoice.find({
      ...baseMatch,
      fullPaid: true,
      ...(andFilters.length ? { $and: andFilters } : {}),
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
          sentQuotes: sentQuotes.length,
          pendingQuotes: pendingQuotes.length,
          invoicesUnpaid: invoicesUnpaid.length,
          invoicesPaidPartial: invoicesPaidPartial.length,
          invoicesPaidFullPaid: invoicesPaidFullPaid.length,
        },
        acceptedNotInvoiced,
        acceptedNotCompleted,
        sentQuotes,
        pendingQuotes,
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
