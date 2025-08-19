const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');
const JournalEntry = mongoose.model('JournalEntry');

const getAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, includeUnposted = 'false' } = req.query;

    // 查找科目
    const account = await ChartOfAccounts.findOne({
      _id: id,
      removed: false
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Account not found',
      });
    }

    // 構建日期範圍查詢
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.transactionDate = {};
      if (startDate) dateQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) dateQuery.transactionDate.$lte = new Date(endDate);
    }

    // 構建過帳狀態查詢
    const postingQuery = includeUnposted === 'true' ? {} : { isPosted: true };

    // 查詢相關的分錄
    const entries = await JournalEntry.find({
      ...dateQuery,
      ...postingQuery,
      removed: false,
      $or: [
        { 'entries.debitAccount': id },
        { 'entries.creditAccount': id }
      ]
    }).sort({ transactionDate: 1, entryNumber: 1 });

    // 計算餘額變動
    let runningBalance = startDate ? 0 : account.openingBalance;
    const transactions = [];
    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach(entry => {
      entry.entries.forEach(line => {
        if (line.debitAccount && line.debitAccount.toString() === id) {
          // 借方
          runningBalance += line.amount;
          totalDebits += line.amount;
          transactions.push({
            date: entry.transactionDate,
            entryNumber: entry.entryNumber,
            description: line.description,
            debitAmount: line.amount,
            creditAmount: 0,
            balance: runningBalance,
            isPosted: entry.isPosted,
            sourceType: entry.sourceType,
            sourceDocumentNumber: entry.sourceDocumentNumber
          });
        } else if (line.creditAccount && line.creditAccount.toString() === id) {
          // 貸方
          runningBalance -= line.amount;
          totalCredits += line.amount;
          transactions.push({
            date: entry.transactionDate,
            entryNumber: entry.entryNumber,
            description: line.description,
            debitAmount: 0,
            creditAmount: line.amount,
            balance: runningBalance,
            isPosted: entry.isPosted,
            sourceType: entry.sourceType,
            sourceDocumentNumber: entry.sourceDocumentNumber
          });
        }
      });
    });

    // 計算期初期末餘額
    const openingBalance = startDate ? 0 : account.openingBalance;
    const endingBalance = runningBalance;
    const netChange = totalDebits - totalCredits;

    const result = {
      account: {
        _id: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      balances: {
        openingBalance,
        endingBalance,
        currentBalance: account.currentBalance,
        netChange
      },
      totals: {
        totalDebits,
        totalCredits,
        transactionCount: transactions.length
      },
      transactions
    };

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully fetched account balance',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching account balance: ' + error.message,
    });
  }
};

module.exports = getAccountBalance;
