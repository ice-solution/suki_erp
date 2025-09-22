const mongoose = require('mongoose');
const JournalEntry = mongoose.model('JournalEntry');
const Invoice = mongoose.model('Invoice');
const Payment = mongoose.model('Payment');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const generateAutoEntry = async (req, res) => {
  try {
    const { sourceType, sourceId, entryType = 'automatic' } = req.body;

    if (!sourceType || !sourceId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Source type and source ID are required',
      });
    }

    let entries = [];
    let description = '';
    let sourceDocument = null;
    let sourceModel = '';
    let sourceDocumentNumber = '';

    switch (sourceType) {
      case 'invoice':
        sourceDocument = await Invoice.findById(sourceId).populate(['client', 'revenueAccount', 'receivableAccount']);
        if (!sourceDocument) {
          throw new Error('Invoice not found');
        }
        
        sourceModel = 'Invoice';
        sourceDocumentNumber = `INV-${sourceDocument.number}`;
        description = `發票記錄 - ${sourceDocument.client?.name} - ${sourceDocument.content || ''}`;

        // 使用發票中設定的會計科目，如果沒有設定則使用預設科目
        let receivableAccount = sourceDocument.receivableAccount;
        let revenueAccount = sourceDocument.revenueAccount;
        
        if (!receivableAccount) {
          receivableAccount = await ChartOfAccounts.findOne({ accountCode: '1101' }); // 預設應收帳款
        }
        if (!revenueAccount) {
          revenueAccount = await ChartOfAccounts.findOne({ accountCode: '4001' }); // 預設營業收入
        }

        if (!receivableAccount || !revenueAccount) {
          throw new Error('Required accounts not found. Please set accounts in invoice or create default accounts.');
        }

        entries = [
          {
            debitAccount: receivableAccount._id,
            amount: sourceDocument.total,
            description: `應收 ${sourceDocument.client?.name} 發票金額`
          },
          {
            creditAccount: revenueAccount._id,
            amount: sourceDocument.total,
            description: `營業收入 - 發票 ${sourceDocument.number}`
          }
        ];
        break;

      case 'payment':
        sourceDocument = await Payment.findById(sourceId).populate('client');
        if (!sourceDocument) {
          throw new Error('Payment not found');
        }

        sourceModel = 'Payment';
        sourceDocumentNumber = `PAY-${sourceDocument.number}`;
        description = `收款記錄 - ${sourceDocument.client?.name}`;

        // 借：現金，貸：應收帳款
        const cashAccount = await ChartOfAccounts.findOne({ accountCode: '1001' }); // 現金
        const receivableAccount2 = await ChartOfAccounts.findOne({ accountCode: '1101' }); // 應收帳款

        if (!cashAccount || !receivableAccount2) {
          throw new Error('Required accounts not found');
        }

        entries = [
          {
            debitAccount: cashAccount._id,
            amount: sourceDocument.amount,
            description: `收到客戶 ${sourceDocument.client?.name} 付款`
          },
          {
            creditAccount: receivableAccount2._id,
            amount: sourceDocument.amount,
            description: `沖銷應收帳款 - ${sourceDocument.client?.name}`
          }
        ];
        break;


      default:
        throw new Error('Unsupported source type');
    }

    // 創建分錄
    const createEntryData = {
      transactionDate: sourceDocument.date || new Date(),
      entryType,
      sourceType,
      sourceDocument: sourceId,
      sourceModel,
      sourceDocumentNumber,
      entries,
      description
    };

    // 使用創建分錄的控制器
    const createController = require('./create');
    req.body = createEntryData;
    
    return await createController(req, res);

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error generating automatic entry: ' + error.message,
    });
  }
};

module.exports = generateAutoEntry;
