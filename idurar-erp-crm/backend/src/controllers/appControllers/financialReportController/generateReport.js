const generateReport = async (req, res) => {
  try {
    const { reportType } = req.body;

    switch (reportType) {
      case 'profit_loss':
        const profitLossController = require('./generateProfitLossReport');
        return await profitLossController(req, res);
      
      case 'balance_sheet':
        const balanceSheetController = require('./generateBalanceSheet');
        return await balanceSheetController(req, res);
      
      case 'trial_balance':
        const trialBalanceController = require('./generateTrialBalance');
        return await trialBalanceController(req, res);
      
      default:
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Invalid report type',
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error generating report: ' + error.message,
    });
  }
};

module.exports = generateReport;
