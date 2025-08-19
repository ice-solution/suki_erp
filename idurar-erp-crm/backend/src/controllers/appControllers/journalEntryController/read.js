const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');

const read = async (req, res) => {
  try {
    const { id } = req.params;

    const journalEntry = await JournalEntry.findOne({
      _id: id,
      removed: false
    }).populate([
      'accountingPeriod',
      'entries.debitAccount',
      'entries.creditAccount',
      'createdBy',
      'postedBy',
      'reversalOf',
      'reversedBy'
    ]);

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Journal entry not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: journalEntry,
      message: 'Successfully fetched journal entry',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching journal entry: ' + error.message,
    });
  }
};

module.exports = read;
