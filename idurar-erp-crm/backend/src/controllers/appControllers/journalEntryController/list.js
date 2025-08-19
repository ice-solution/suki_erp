const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');

const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      entryType,
      sourceType,
      accountingPeriod,
      startDate,
      endDate,
      search
    } = req.query;

    // 構建查詢條件
    const query = { removed: false };
    
    if (status) query.status = status;
    if (entryType) query.entryType = entryType;
    if (sourceType) query.sourceType = sourceType;
    if (accountingPeriod) query.accountingPeriod = accountingPeriod;

    // 日期範圍查詢
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    // 搜索條件
    if (search) {
      query.$or = [
        { entryNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sourceDocumentNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { transactionDate: -1, entryNumber: -1 },
      populate: [
        'accountingPeriod',
        'entries.debitAccount',
        'entries.creditAccount',
        'createdBy',
        'postedBy'
      ]
    };

    const entries = await JournalEntry.paginate(query, options);

    return res.status(200).json({
      success: true,
      result: entries,
      message: `Successfully fetched ${entries.docs.length} journal entries`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching journal entries: ' + error.message,
    });
  }
};

module.exports = list;
