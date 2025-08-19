const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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

    // 只能修改草稿狀態的分錄
    if (journalEntry.isPosted) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot update posted journal entry',
      });
    }

    // 更新允許的欄位
    const allowedFields = [
      'transactionDate', 'description', 'notes', 'entries'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        journalEntry[field] = updateData[field];
      }
    });

    await journalEntry.save();

    // 重新填充關聯數據
    await journalEntry.populate([
      'accountingPeriod',
      'entries.debitAccount',
      'entries.creditAccount',
      'createdBy'
    ]);

    return res.status(200).json({
      success: true,
      result: journalEntry,
      message: 'Journal entry updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating journal entry: ' + error.message,
    });
  }
};

module.exports = update;
