const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');
const AccountingPeriod = mongoose.model('AccountingPeriod');

const create = async (req, res) => {
  try {
    const {
      transactionDate,
      entryType = 'manual',
      sourceType = 'manual',
      sourceDocument,
      sourceModel,
      sourceDocumentNumber,
      accountingPeriod,
      entries,
      description,
      notes
    } = req.body;

    // 驗證必填欄位
    if (!transactionDate || !description || !entries || entries.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Transaction date, description and entries are required',
      });
    }

    // 驗證會計期間
    let period;
    if (accountingPeriod) {
      period = await AccountingPeriod.findById(accountingPeriod);
    } else {
      // 如果沒有指定期間，根據交易日期查找
      period = await AccountingPeriod.getPeriodByDate(new Date(transactionDate));
    }

    if (!period) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No valid accounting period found for transaction date',
      });
    }

    if (period.status === 'closed' || period.status === 'locked') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot create entries in closed or locked period',
      });
    }

    // 驗證分錄借貸平衡
    let totalDebit = 0;
    let totalCredit = 0;
    
    entries.forEach(entry => {
      if (!entry.amount || entry.amount <= 0) {
        throw new Error('Entry amount must be greater than 0');
      }
      if (!entry.description) {
        throw new Error('Entry description is required');
      }
      if (!entry.debitAccount && !entry.creditAccount) {
        throw new Error('Either debit or credit account must be specified');
      }
      if (entry.debitAccount && entry.creditAccount) {
        throw new Error('Cannot specify both debit and credit account in single entry');
      }

      if (entry.debitAccount) {
        totalDebit += entry.amount;
      }
      if (entry.creditAccount) {
        totalCredit += entry.amount;
      }
    });

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Debit and credit amounts must be equal',
      });
    }

    // 生成分錄編號
    const entryCount = await JournalEntry.countDocuments({
      accountingPeriod: period._id,
      removed: false
    });
    const entryNumber = `JE-${period.fiscalYear}-${period.periodNumber.toString().padStart(2, '0')}-${(entryCount + 1).toString().padStart(4, '0')}`;

    // 創建分錄
    const journalEntry = new JournalEntry({
      entryNumber,
      transactionDate: new Date(transactionDate),
      entryType,
      sourceType,
      sourceDocument,
      sourceModel,
      sourceDocumentNumber,
      accountingPeriod: period._id,
      entries,
      description,
      notes: notes || '',
      status: 'draft',
      createdBy: req.admin._id
    });

    await journalEntry.save();

    // 自動填充關聯數據
    await journalEntry.populate([
      'accountingPeriod',
      'entries.debitAccount',
      'entries.creditAccount',
      'createdBy'
    ]);

    return res.status(201).json({
      success: true,
      result: journalEntry,
      message: 'Journal entry created successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating journal entry: ' + error.message,
    });
  }
};

module.exports = create;
