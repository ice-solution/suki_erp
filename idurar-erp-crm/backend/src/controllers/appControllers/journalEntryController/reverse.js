const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');

const reverse = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Reversal reason is required',
      });
    }

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

    // 執行沖銷
    const reversalEntry = await journalEntry.reverse(reason, req.admin._id);

    return res.status(200).json({
      success: true,
      result: {
        originalEntry: journalEntry,
        reversalEntry
      },
      message: 'Journal entry reversed successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error reversing journal entry: ' + error.message,
    });
  }
};

module.exports = reverse;
