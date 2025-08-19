const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const create = async (req, res) => {
  try {
    const {
      accountCode,
      accountName,
      accountType,
      accountSubType,
      normalBalance,
      parentAccount,
      level,
      isDetailAccount,
      allowManualEntry,
      description,
      showInBalanceSheet,
      showInIncomeStatement,
      openingBalance
    } = req.body;

    // 驗證必填欄位
    if (!accountCode || !accountName || !accountType || !accountSubType || !normalBalance) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Account code, name, type, subtype and normal balance are required',
      });
    }

    // 檢查科目代碼是否已存在
    const existingAccount = await ChartOfAccounts.findOne({
      accountCode,
      removed: false
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Account code already exists',
      });
    }

    // 如果有父科目，驗證父科目存在且層級正確
    if (parentAccount) {
      const parent = await ChartOfAccounts.findById(parentAccount);
      if (!parent) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Parent account not found',
        });
      }

      // 更新父科目為非明細科目
      if (parent.isDetailAccount) {
        parent.isDetailAccount = false;
        await parent.save();
      }
    }

    // 創建科目
    const account = new ChartOfAccounts({
      accountCode,
      accountName,
      accountType,
      accountSubType,
      normalBalance,
      parentAccount: parentAccount || null,
      level: level || 1,
      isDetailAccount: isDetailAccount !== undefined ? isDetailAccount : true,
      allowManualEntry: allowManualEntry !== undefined ? allowManualEntry : true,
      description: description || '',
      showInBalanceSheet: showInBalanceSheet !== undefined ? showInBalanceSheet : true,
      showInIncomeStatement: showInIncomeStatement !== undefined ? showInIncomeStatement : true,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0,
      status: 'active',
      createdBy: req.admin._id
    });

    await account.save();

    // 自動填充關聯數據
    await account.populate('parentAccount createdBy');

    return res.status(201).json({
      success: true,
      result: account,
      message: 'Chart of accounts created successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating chart of accounts: ' + error.message,
    });
  }
};

module.exports = create;
