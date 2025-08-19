const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await ChartOfAccounts.findOne({
      _id: id,
      removed: false
    }).populate(['parentAccount', 'createdBy']);

    if (!account) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Account not found',
      });
    }

    // 獲取子科目
    const children = await ChartOfAccounts.find({
      parentAccount: id,
      removed: false
    }).sort({ accountCode: 1 });

    // 獲取最近的交易記錄
    const JournalEntry = mongoose.model('JournalEntry');
    const recentEntries = await JournalEntry.find({
      $or: [
        { 'entries.debitAccount': id },
        { 'entries.creditAccount': id }
      ],
      removed: false,
      isPosted: true
    })
    .sort({ transactionDate: -1 })
    .limit(10)
    .populate(['createdBy']);

    const accountObj = account.toObject();
    accountObj.children = children;
    accountObj.recentEntries = recentEntries;
    accountObj.childCount = children.length;

    return res.status(200).json({
      success: true,
      result: accountObj,
      message: 'Successfully fetched account',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching account: ' + error.message,
    });
  }
};

module.exports = read;
