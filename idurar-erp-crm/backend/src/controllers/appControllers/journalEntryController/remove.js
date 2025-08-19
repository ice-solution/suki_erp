const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找分錄
    const journalEntry = await JournalEntry.findOne({
      _id: id,
      removed: false
    });

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Journal entry not found',
      });
    }

    // 只能刪除草稿狀態的分錄
    if (journalEntry.isPosted) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot delete posted journal entry. Use reversal instead.',
      });
    }

    // 軟刪除
    journalEntry.removed = true;
    journalEntry.status = 'cancelled';
    await journalEntry.save();

    return res.status(200).json({
      success: true,
      result: journalEntry,
      message: 'Journal entry deleted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting journal entry: ' + error.message,
    });
  }
};

module.exports = remove;
