const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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

    // 檢查是否為系統科目
    if (account.isSystemAccount && !req.admin.role === 'owner') {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Cannot modify system account',
      });
    }

    // 如果更新科目代碼，檢查是否重複
    if (updateData.accountCode && updateData.accountCode !== account.accountCode) {
      const existingAccount = await ChartOfAccounts.findOne({
        accountCode: updateData.accountCode,
        _id: { $ne: id },
        removed: false
      });

      if (existingAccount) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Account code already exists',
        });
      }
    }

    // 如果有交易記錄，限制某些欄位的修改
    const JournalEntry = mongoose.model('JournalEntry');
    const hasTransactions = await JournalEntry.countDocuments({
      $or: [
        { 'entries.debitAccount': id },
        { 'entries.creditAccount': id }
      ],
      removed: false
    });

    if (hasTransactions > 0) {
      // 有交易記錄時，不允許修改科目類型和正常餘額方向
      const restrictedFields = ['accountType', 'accountSubType', 'normalBalance'];
      for (const field of restrictedFields) {
        if (updateData[field] && updateData[field] !== account[field]) {
          return res.status(400).json({
            success: false,
            result: null,
            message: `Cannot change ${field} for account with transactions`,
          });
        }
      }
    }

    // 更新科目
    const allowedFields = [
      'accountCode', 'accountName', 'accountType', 'accountSubType',
      'normalBalance', 'parentAccount', 'level', 'isDetailAccount',
      'allowManualEntry', 'description', 'showInBalanceSheet',
      'showInIncomeStatement', 'status'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        account[field] = updateData[field];
      }
    });

    await account.save();

    // 重新填充關聯數據
    await account.populate(['parentAccount', 'createdBy']);

    return res.status(200).json({
      success: true,
      result: account,
      message: 'Account updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating account: ' + error.message,
    });
  }
};

module.exports = update;
