const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');

const post = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找分錄
    const journalEntry = await JournalEntry.findOne({
      _id: id,
      removed: false
    }).populate([
      'accountingPeriod',
      'entries.debitAccount',
      'entries.creditAccount'
    ]);

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Journal entry not found',
      });
    }

    // 檢查分錄狀態
    if (journalEntry.isPosted) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Journal entry is already posted',
      });
    }

    // 檢查會計期間狀態
    if (journalEntry.accountingPeriod.status === 'closed' || journalEntry.accountingPeriod.status === 'locked') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot post entries in closed or locked period',
      });
    }

    // 過帳分錄
    journalEntry.postedBy = req.admin._id;
    await journalEntry.post();

    // 重新填充數據
    await journalEntry.populate([
      'accountingPeriod',
      'entries.debitAccount',
      'entries.creditAccount',
      'createdBy',
      'postedBy'
    ]);

    return res.status(200).json({
      success: true,
      result: journalEntry,
      message: 'Journal entry posted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error posting journal entry: ' + error.message,
    });
  }
};

module.exports = post;
