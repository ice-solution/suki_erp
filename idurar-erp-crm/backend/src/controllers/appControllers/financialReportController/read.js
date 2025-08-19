const mongoose = require('mongoose');
const FinancialReport = mongoose.model('FinancialReport');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await FinancialReport.findOne({
      _id: id,
      removed: false
    }).populate([
      'accountingPeriod',
      'createdBy',
      'generatedBy',
      'approvedBy',
      'publishedBy'
    ]);

    if (!report) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Financial report not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: report,
      message: 'Successfully fetched financial report',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching financial report: ' + error.message,
    });
  }
};

module.exports = read;
