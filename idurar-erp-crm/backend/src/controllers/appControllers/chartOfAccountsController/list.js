const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      accountType,
      accountSubType,
      status = 'active',
      search,
      parentAccount,
      isDetailAccount
    } = req.query;

    // 構建查詢條件
    const query = { removed: false };
    
    if (accountType) query.accountType = accountType;
    if (accountSubType) query.accountSubType = accountSubType;
    if (status) query.status = status;
    if (parentAccount) query.parentAccount = parentAccount;
    if (isDetailAccount !== undefined) query.isDetailAccount = isDetailAccount === 'true';

    // 搜索條件
    if (search) {
      query.$or = [
        { accountCode: { $regex: search, $options: 'i' } },
        { accountName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { accountCode: 1 },
      populate: ['parentAccount', 'createdBy']
    };

    const accounts = await ChartOfAccounts.paginate(query, options);

    // 為每個科目添加餘額信息
    const accountsWithBalance = await Promise.all(
      accounts.docs.map(async (account) => {
        const accountObj = account.toObject();
        
        // 計算子科目數量
        const childCount = await ChartOfAccounts.countDocuments({
          parentAccount: account._id,
          removed: false
        });
        
        accountObj.childCount = childCount;
        accountObj.hasChildren = childCount > 0;
        
        return accountObj;
      })
    );

    return res.status(200).json({
      success: true,
      result: {
        docs: accountsWithBalance,
        totalDocs: accounts.totalDocs,
        limit: accounts.limit,
        page: accounts.page,
        totalPages: accounts.totalPages,
        hasNextPage: accounts.hasNextPage,
        hasPrevPage: accounts.hasPrevPage,
        nextPage: accounts.nextPage,
        prevPage: accounts.prevPage,
        pagingCounter: accounts.pagingCounter
      },
      message: `Successfully fetched ${accountsWithBalance.length} accounts`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching chart of accounts: ' + error.message,
    });
  }
};

module.exports = list;
