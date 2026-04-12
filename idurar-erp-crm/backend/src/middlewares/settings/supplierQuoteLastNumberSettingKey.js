/** SupplierQuote numberPrefix 與財務設定鍵（settingKey 會存成小寫） */
const SUPPLIER_QUOTE_NUMBER_PREFIXES = ['NO', 'PO', 'S', 'SWP', 'E', 'Y'];

function normalizeSupplierQuotePrefix(prefix) {
  const p = String(prefix || 'S').trim();
  return p ? p.toLowerCase() : 's';
}

function supplierQuoteLastNumberSettingKey(prefix) {
  return `last_supplier_quote_number_${normalizeSupplierQuotePrefix(prefix)}`;
}

module.exports = {
  SUPPLIER_QUOTE_NUMBER_PREFIXES,
  normalizeSupplierQuotePrefix,
  supplierQuoteLastNumberSettingKey,
};
