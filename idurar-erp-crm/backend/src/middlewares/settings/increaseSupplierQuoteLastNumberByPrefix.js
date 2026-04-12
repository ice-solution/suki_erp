const mongoose = require('mongoose');

const Model = mongoose.model('Setting');
const {
  supplierQuoteLastNumberSettingKey,
  normalizeSupplierQuotePrefix,
} = require('./supplierQuoteLastNumberSettingKey');

/**
 * 依 Supplier Type（numberPrefix）遞增對應的 last number（財務設定 finance_settings）。
 * 首次使用某類型時建立紀錄；S 類型若尚無專用鍵，會以舊的 last_supplier_quote_number 為初值再 +1。
 */
const increaseSupplierQuoteLastNumberByPrefix = async (prefix) => {
  const settingKey = supplierQuoteLastNumberSettingKey(prefix);

  const existing = await Model.findOne({ settingKey }).exec();
  if (!existing) {
    let seed = 0;
    if (normalizeSupplierQuotePrefix(prefix) === 's') {
      const legacy = await Model.findOne({ settingKey: 'last_supplier_quote_number' }).exec();
      if (legacy && legacy.settingValue != null && legacy.settingValue !== '') {
        seed = Number(legacy.settingValue);
        if (Number.isNaN(seed)) seed = 0;
      }
    }
    await Model.create({
      settingCategory: 'finance_settings',
      settingKey,
      valueType: 'number',
      settingValue: seed,
    });
  }

  return Model.findOneAndUpdate(
    { settingKey },
    { $inc: { settingValue: 1 } },
    { new: true, runValidators: true }
  ).exec();
};

module.exports = increaseSupplierQuoteLastNumberByPrefix;
