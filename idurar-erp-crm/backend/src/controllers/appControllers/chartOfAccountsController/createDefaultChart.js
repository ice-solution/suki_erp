const mongoose = require('mongoose');
const ChartOfAccounts = mongoose.model('ChartOfAccounts');

const createDefaultChart = async (req, res) => {
  try {
    // 檢查是否已存在科目
    const existingAccounts = await ChartOfAccounts.countDocuments({ removed: false });
    if (existingAccounts > 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Chart of accounts already exists',
      });
    }

    // 預設會計科目表
    const defaultAccounts = [
      // === 資產類 ===
      // 流動資產
      { code: '1001', name: '現金', type: 'asset', subType: 'current_asset', balance: 'debit', level: 1 },
      { code: '1002', name: '銀行存款', type: 'asset', subType: 'current_asset', balance: 'debit', level: 1 },
      { code: '1101', name: '應收帳款', type: 'asset', subType: 'current_asset', balance: 'debit', level: 1 },
      { code: '1102', name: '應收票據', type: 'asset', subType: 'current_asset', balance: 'debit', level: 1 },
      { code: '1201', name: '預付款項', type: 'asset', subType: 'current_asset', balance: 'debit', level: 1 },
      { code: '1301', name: '存貨', type: 'asset', subType: 'current_asset', balance: 'debit', level: 1 },
      
      // 固定資產
      { code: '1501', name: '土地', type: 'asset', subType: 'fixed_asset', balance: 'debit', level: 1 },
      { code: '1502', name: '建築物', type: 'asset', subType: 'fixed_asset', balance: 'debit', level: 1 },
      { code: '1503', name: '機器設備', type: 'asset', subType: 'fixed_asset', balance: 'debit', level: 1 },
      { code: '1504', name: '運輸設備', type: 'asset', subType: 'fixed_asset', balance: 'debit', level: 1 },
      { code: '1505', name: '辦公設備', type: 'asset', subType: 'fixed_asset', balance: 'debit', level: 1 },
      { code: '1581', name: '累計折舊-建築物', type: 'asset', subType: 'fixed_asset', balance: 'credit', level: 1 },
      { code: '1582', name: '累計折舊-機器設備', type: 'asset', subType: 'fixed_asset', balance: 'credit', level: 1 },

      // === 負債類 ===
      // 流動負債
      { code: '2001', name: '應付帳款', type: 'liability', subType: 'current_liability', balance: 'credit', level: 1 },
      { code: '2002', name: '應付票據', type: 'liability', subType: 'current_liability', balance: 'credit', level: 1 },
      { code: '2101', name: '預收款項', type: 'liability', subType: 'current_liability', balance: 'credit', level: 1 },
      { code: '2201', name: '應付薪資', type: 'liability', subType: 'current_liability', balance: 'credit', level: 1 },
      { code: '2301', name: '應付稅捐', type: 'liability', subType: 'current_liability', balance: 'credit', level: 1 },
      
      // 長期負債
      { code: '2501', name: '長期借款', type: 'liability', subType: 'long_term_liability', balance: 'credit', level: 1 },

      // === 權益類 ===
      { code: '3001', name: '股本', type: 'equity', subType: 'owner_equity', balance: 'credit', level: 1 },
      { code: '3101', name: '資本公積', type: 'equity', subType: 'owner_equity', balance: 'credit', level: 1 },
      { code: '3201', name: '保留盈餘', type: 'equity', subType: 'retained_earnings', balance: 'credit', level: 1 },
      { code: '3301', name: '本期損益', type: 'equity', subType: 'retained_earnings', balance: 'credit', level: 1 },

      // === 收入類 ===
      { code: '4001', name: '營業收入', type: 'revenue', subType: 'operating_revenue', balance: 'credit', level: 1 },
      { code: '4002', name: '工程收入', type: 'revenue', subType: 'operating_revenue', balance: 'credit', level: 1 },
      { code: '4101', name: '其他收入', type: 'revenue', subType: 'other_revenue', balance: 'credit', level: 1 },
      { code: '4201', name: '利息收入', type: 'revenue', subType: 'other_revenue', balance: 'credit', level: 1 },

      // === 費用類 ===
      // 營業成本
      { code: '5001', name: '材料成本', type: 'expense', subType: 'cost_of_goods_sold', balance: 'debit', level: 1 },
      { code: '5002', name: '人工成本', type: 'expense', subType: 'cost_of_goods_sold', balance: 'debit', level: 1 },
      { code: '5003', name: '製造費用', type: 'expense', subType: 'cost_of_goods_sold', balance: 'debit', level: 1 },
      
      // 營業費用
      { code: '6001', name: '薪資費用', type: 'expense', subType: 'operating_expense', balance: 'debit', level: 1 },
      { code: '6002', name: '租金費用', type: 'expense', subType: 'operating_expense', balance: 'debit', level: 1 },
      { code: '6003', name: '水電費', type: 'expense', subType: 'operating_expense', balance: 'debit', level: 1 },
      { code: '6004', name: '折舊費用', type: 'expense', subType: 'operating_expense', balance: 'debit', level: 1 },
      { code: '6005', name: '辦公費用', type: 'expense', subType: 'operating_expense', balance: 'debit', level: 1 },
      { code: '6006', name: '交通費用', type: 'expense', subType: 'operating_expense', balance: 'debit', level: 1 },
      
      // 營業外費用
      { code: '7001', name: '利息費用', type: 'expense', subType: 'financial_expense', balance: 'debit', level: 1 },
      { code: '7002', name: '匯兌損失', type: 'expense', subType: 'other_expense', balance: 'debit', level: 1 },
    ];

    const accounts = [];
    for (const acc of defaultAccounts) {
      const account = new ChartOfAccounts({
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        accountSubType: acc.subType,
        normalBalance: acc.balance,
        level: acc.level,
        isDetailAccount: true,
        allowManualEntry: true,
        showInBalanceSheet: ['asset', 'liability', 'equity'].includes(acc.type),
        showInIncomeStatement: ['revenue', 'expense'].includes(acc.type),
        status: 'active',
        createdBy: req.admin._id
      });
      accounts.push(account);
    }

    await ChartOfAccounts.insertMany(accounts);

    return res.status(201).json({
      success: true,
      result: accounts,
      message: `Successfully created ${accounts.length} default accounts`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating default chart of accounts: ' + error.message,
    });
  }
};

module.exports = createDefaultChart;
