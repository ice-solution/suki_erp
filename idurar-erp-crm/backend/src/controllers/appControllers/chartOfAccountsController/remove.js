const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

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

    // 檢查是否可以刪除
    const canDeleteResult = await account.canDelete();
    if (!canDeleteResult.canDelete) {
      return res.status(400).json({
        success: false,
        result: null,
        message: canDeleteResult.reason,
      });
    }

    // 檢查是否為系統科目
    if (account.isSystemAccount) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Cannot delete system account',
      });
    }

    // 軟刪除
    account.removed = true;
    account.status = 'archived';
    await account.save();

    return res.status(200).json({
      success: true,
      result: account,
      message: 'Account deleted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting account: ' + error.message,
    });
  }
};

module.exports = remove;
