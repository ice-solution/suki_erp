const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const getAccountHierarchy = async (req, res) => {
  try {
    const { accountType, includeBalances = 'true' } = req.query;

    // 構建查詢條件
    const query = { removed: false, status: 'active' };
    if (accountType) {
      query.accountType = accountType;
    }

    // 獲取所有科目
    const accounts = await ChartOfAccounts.find(query)
      .sort({ accountCode: 1 })
      .lean();

    // 構建階層結構
    const accountMap = new Map();
    const rootAccounts = [];

    // 先將所有科目放入Map
    accounts.forEach(account => {
      account.children = [];
      accountMap.set(account._id.toString(), account);
    });

    // 建立父子關係
    accounts.forEach(account => {
      if (account.parentAccount) {
        const parent = accountMap.get(account.parentAccount.toString());
        if (parent) {
          parent.children.push(account);
        } else {
          rootAccounts.push(account);
        }
      } else {
        rootAccounts.push(account);
      }
    });

    // 排序子科目
    const sortChildren = (accounts) => {
      accounts.forEach(account => {
        if (account.children.length > 0) {
          account.children.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
          sortChildren(account.children);
        }
      });
    };

    sortChildren(rootAccounts);

    // 如果需要餘額信息，計算總計
    let summary = null;
    if (includeBalances === 'true') {
      const calculateTotals = (accounts) => {
        let total = 0;
        accounts.forEach(account => {
          if (account.children.length > 0) {
            account.subtotal = calculateTotals(account.children);
            total += account.subtotal;
          } else {
            total += account.currentBalance || 0;
          }
        });
        return total;
      };

      const totalBalance = calculateTotals(rootAccounts);
      
      summary = {
        totalAccounts: accounts.length,
        totalBalance,
        accountTypes: {}
      };

      // 按科目類型統計
      accounts.forEach(account => {
        if (!summary.accountTypes[account.accountType]) {
          summary.accountTypes[account.accountType] = {
            count: 0,
            balance: 0
          };
        }
        summary.accountTypes[account.accountType].count++;
        summary.accountTypes[account.accountType].balance += account.currentBalance || 0;
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        hierarchy: rootAccounts,
        summary
      },
      message: 'Successfully fetched account hierarchy',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching account hierarchy: ' + error.message,
    });
  }
};

module.exports = getAccountHierarchy;
