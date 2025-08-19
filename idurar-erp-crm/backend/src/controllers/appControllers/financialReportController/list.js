const mongoose = require('mongoose');
const FinancialReport = mongoose.model('FinancialReport');

const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      reportType,
      status,
      startDate,
      endDate
    } = req.query;

    // 構建查詢條件
    const query = { removed: false };
    
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    // 日期範圍查詢
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created: -1 },
      populate: ['accountingPeriod', 'createdBy', 'generatedBy', 'approvedBy']
    };

    const reports = await FinancialReport.paginate(query, options);

    return res.status(200).json({
      success: true,
      result: reports,
      message: `Successfully fetched ${reports.docs.length} financial reports`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching financial reports: ' + error.message,
    });
  }
};

module.exports = list;
