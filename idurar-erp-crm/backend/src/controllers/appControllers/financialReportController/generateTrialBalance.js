const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const generateTrialBalance = async (req, res) => {
  try {
    const { asOfDate = new Date() } = req.query;

    // 模擬試算表數據
    const mockData = {
      reportType: 'trial_balance',
      reportName: '試算表',
      asOfDate,
      items: [
        { accountCode: '1001', accountName: '現金', debitBalance: 500000, creditBalance: 0 },
        { accountCode: '1002', accountName: '銀行存款', debitBalance: 800000, creditBalance: 0 },
        { accountCode: '1101', accountName: '應收帳款', debitBalance: 600000, creditBalance: 0 },
        { accountCode: '2001', accountName: '應付帳款', debitBalance: 0, creditBalance: 300000 },
        { accountCode: '3001', accountName: '股本', debitBalance: 0, creditBalance: 3000000 },
        { accountCode: '4001', accountName: '營業收入', debitBalance: 0, creditBalance: 1500000 },
        { accountCode: '5001', accountName: '材料成本', debitBalance: 600000, creditBalance: 0 },
      ],
      totals: {
        totalDebits: 2500000,
        totalCredits: 4800000
      }
    };

    return res.status(200).json({
      success: true,
      result: mockData,
      message: 'Trial balance generated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error generating trial balance: ' + error.message,
    });
  }
};

module.exports = generateTrialBalance;
