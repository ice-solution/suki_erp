const mongoose = require('mongoose');
const readBySettingKey = require('@/middlewares/settings/readBySettingKey');

function normalizeSupplierName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '');
}

/**
 * 從供應商列表依財務設定（default_quote_supplier_id / default_quote_supplier_name）解析預設供應商 ObjectId。
 * 名稱比對會去除空白；找不到設定名稱時以 finance_settings 的 default_quote_supplier_name 為準。
 */
async function resolveDefaultSupplierId() {
  const Supplier = mongoose.model('Supplier');

  const idSetting = await readBySettingKey({ settingKey: 'default_quote_supplier_id' });
  if (idSetting?.settingValue) {
    const byId = await Supplier.findOne({ _id: idSetting.settingValue, removed: false })
      .select('_id')
      .lean();
    if (byId) return byId._id;
  }

  const nameSetting = await readBySettingKey({ settingKey: 'default_quote_supplier_name' });
  const preferredName = String(nameSetting?.settingValue || '').trim();
  if (!preferredName) return null;

  const suppliers = await Supplier.find({ removed: false }).select('_id name').lean();
  if (!suppliers.length) return null;

  const target = normalizeSupplierName(preferredName);
  const exact = suppliers.find((s) => normalizeSupplierName(s.name) === target);
  if (exact) return exact._id;

  const loose = suppliers.find((s) => {
    const label = normalizeSupplierName(s.name);
    return label && (label.includes(target) || target.includes(label));
  });
  return loose?._id || null;
}

module.exports = {
  resolveDefaultSupplierId,
  normalizeSupplierName,
};
