const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');
const JournalEntry = mongoose.model('JournalEntry');
const Invoice = mongoose.model('Invoice');
const Payment = mongoose.model('Payment');

const generateProfitLossReport = async (req, res) => {
  try {
    const { startDate, endDate, includeUnposted = false } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 構建過帳狀態查詢
    const postingQuery = includeUnposted ? {} : { isPosted: true };

    // 獲取收入科目
    const revenueAccounts = await ChartOfAccounts.find({
      accountType: 'revenue',
      removed: false,
      status: 'active'
    }).sort({ accountCode: 1 });

    // 獲取費用科目
    const expenseAccounts = await ChartOfAccounts.find({
      accountType: 'expense',
      removed: false,
      status: 'active'
    }).sort({ accountCode: 1 });

    // 計算收入和費用
    const revenueData = await calculateAccountBalances(revenueAccounts, start, end, postingQuery);
    const expenseData = await calculateAccountBalances(expenseAccounts, start, end, postingQuery);

    // 按子類型分組
    const revenueBySubType = groupBySubType(revenueData);
    const expenseBySubType = groupBySubType(expenseData);

    // 計算總計
    const totalRevenue = revenueData.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
    const grossProfit = totalRevenue;
    const operatingExpenses = expenseData
      .filter(item => item.accountSubType === 'operating_expense')
      .reduce((sum, item) => sum + item.amount, 0);
    const costOfGoodsSold = expenseData
      .filter(item => item.accountSubType === 'cost_of_goods_sold')
      .reduce((sum, item) => sum + item.amount, 0);
    const operatingIncome = grossProfit - costOfGoodsSold - operatingExpenses;
    const netIncome = totalRevenue - totalExpenses;

    // 構建報表結構
    const reportData = {
      reportType: 'profit_loss',
      reportName: '損益表',
      period: { startDate, endDate },
      sections: [],
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        operatingIncome,
        netIncome,
        costOfGoodsSold,
        operatingExpenses
      }
    };

    // 營業收入
    if (revenueBySubType.operating_revenue && revenueBySubType.operating_revenue.length > 0) {
      reportData.sections.push({
        title: '營業收入',
        accountSubType: 'operating_revenue',
        items: revenueBySubType.operating_revenue,
        subtotal: revenueBySubType.operating_revenue.reduce((sum, item) => sum + Math.abs(item.amount), 0)
      });
    }

    // 其他收入
    if (revenueBySubType.other_revenue && revenueBySubType.other_revenue.length > 0) {
      reportData.sections.push({
        title: '其他收入',
        accountSubType: 'other_revenue',
        items: revenueBySubType.other_revenue,
        subtotal: revenueBySubType.other_revenue.reduce((sum, item) => sum + Math.abs(item.amount), 0)
      });
    }

    // 銷貨成本
    if (expenseBySubType.cost_of_goods_sold && expenseBySubType.cost_of_goods_sold.length > 0) {
      reportData.sections.push({
        title: '銷貨成本',
        accountSubType: 'cost_of_goods_sold',
        items: expenseBySubType.cost_of_goods_sold,
        subtotal: expenseBySubType.cost_of_goods_sold.reduce((sum, item) => sum + item.amount, 0)
      });
    }

    // 營業費用
    if (expenseBySubType.operating_expense && expenseBySubType.operating_expense.length > 0) {
      reportData.sections.push({
        title: '營業費用',
        accountSubType: 'operating_expense',
        items: expenseBySubType.operating_expense,
        subtotal: expenseBySubType.operating_expense.reduce((sum, item) => sum + item.amount, 0)
      });
    }

    // 財務費用
    if (expenseBySubType.financial_expense && expenseBySubType.financial_expense.length > 0) {
      reportData.sections.push({
        title: '財務費用',
        accountSubType: 'financial_expense',
        items: expenseBySubType.financial_expense,
        subtotal: expenseBySubType.financial_expense.reduce((sum, item) => sum + item.amount, 0)
      });
    }

    // 其他費用
    if (expenseBySubType.other_expense && expenseBySubType.other_expense.length > 0) {
      reportData.sections.push({
        title: '其他費用',
        accountSubType: 'other_expense',
        items: expenseBySubType.other_expense,
        subtotal: expenseBySubType.other_expense.reduce((sum, item) => sum + item.amount, 0)
      });
    }

    return res.status(200).json({
      success: true,
      result: reportData,
      message: 'Profit & Loss report generated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error generating profit & loss report: ' + error.message,
    });
  }
};

// 計算科目餘額的輔助函數
async function calculateAccountBalances(accounts, startDate, endDate, postingQuery) {
  const results = [];

  for (const account of accounts) {
    // 查詢期間內的分錄
    const entries = await JournalEntry.find({
      transactionDate: {
        $gte: startDate,
        $lte: endDate
      },
      ...postingQuery,
      removed: false,
      $or: [
        { 'entries.debitAccount': account._id },
        { 'entries.creditAccount': account._id }
      ]
    });

    let balance = 0;
    
    entries.forEach(entry => {
      entry.entries.forEach(line => {
        if (line.debitAccount && line.debitAccount.toString() === account._id.toString()) {
          // 借方 - 對於收入科目來說是減少，對於費用科目是增加
          if (account.accountType === 'revenue') {
            balance -= line.amount;
          } else {
            balance += line.amount;
          }
        }
        if (line.creditAccount && line.creditAccount.toString() === account._id.toString()) {
          // 貸方 - 對於收入科目來說是增加，對於費用科目是減少
          if (account.accountType === 'revenue') {
            balance += line.amount;
          } else {
            balance -= line.amount;
          }
        }
      });
    });

    // 只包含有餘額的科目
    if (Math.abs(balance) > 0.01) {
      results.push({
        accountId: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubType: account.accountSubType,
        amount: Math.abs(balance)
      });
    }
  }

  return results;
}

// 按子類型分組的輔助函數
function groupBySubType(accounts) {
  const grouped = {};
  
  accounts.forEach(account => {
    if (!grouped[account.accountSubType]) {
      grouped[account.accountSubType] = [];
    }
    grouped[account.accountSubType].push(account);
  });

  return grouped;
}

module.exports = generateProfitLossReport;
