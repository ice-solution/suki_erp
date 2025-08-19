const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const generateBalanceSheet = async (req, res) => {
  try {
    const { asOfDate = new Date() } = req.query;

    // 模擬資產負債表數據（實際應從會計科目計算）
    const mockData = {
      reportType: 'balance_sheet',
      reportName: '資產負債表',
      asOfDate,
      sections: [
        {
          title: '資產',
          subsections: [
            {
              title: '流動資產',
              items: [
                { accountCode: '1001', accountName: '現金', amount: 500000 },
                { accountCode: '1002', accountName: '銀行存款', amount: 800000 },
                { accountCode: '1101', accountName: '應收帳款', amount: 600000 },
                { accountCode: '1301', accountName: '存貨', amount: 400000 },
              ],
              subtotal: 2300000
            },
            {
              title: '固定資產',
              items: [
                { accountCode: '1502', accountName: '建築物', amount: 2000000 },
                { accountCode: '1503', accountName: '機器設備', amount: 1500000 },
                { accountCode: '1581', accountName: '累計折舊-建築物', amount: -200000 },
                { accountCode: '1582', accountName: '累計折舊-機器設備', amount: -300000 },
              ],
              subtotal: 3000000
            }
          ],
          total: 5300000
        },
        {
          title: '負債及權益',
          subsections: [
            {
              title: '流動負債',
              items: [
                { accountCode: '2001', accountName: '應付帳款', amount: 300000 },
                { accountCode: '2201', accountName: '應付薪資', amount: 100000 },
              ],
              subtotal: 400000
            },
            {
              title: '權益',
              items: [
                { accountCode: '3001', accountName: '股本', amount: 3000000 },
                { accountCode: '3201', accountName: '保留盈餘', amount: 1900000 },
              ],
              subtotal: 4900000
            }
          ],
          total: 5300000
        }
      ]
    };

    return res.status(200).json({
      success: true,
      result: mockData,
      message: 'Balance sheet generated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error generating balance sheet: ' + error.message,
    });
  }
};

module.exports = generateBalanceSheet;
