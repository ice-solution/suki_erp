const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const search = async (req, res) => {
  try {
    const { q, accountType, isDetailAccount, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Search query must be at least 2 characters',
      });
    }

    // 構建查詢條件
    const query = {
      removed: false,
      status: 'active',
      $or: [
        { accountCode: { $regex: q, $options: 'i' } },
        { accountName: { $regex: q, $options: 'i' } }
      ]
    };

    if (accountType) {
      query.accountType = accountType;
    }

    if (isDetailAccount !== undefined) {
      query.isDetailAccount = isDetailAccount === 'true';
    }

    const accounts = await ChartOfAccounts.find(query)
      .select('accountCode accountName accountType accountSubType normalBalance currentBalance isDetailAccount')
      .sort({ accountCode: 1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      result: accounts,
      message: `Found ${accounts.length} matching accounts`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error searching accounts: ' + error.message,
    });
  }
};

module.exports = search;
