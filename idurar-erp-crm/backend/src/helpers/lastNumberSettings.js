const mongoose = require('mongoose');
const readBySettingKey = require('@/middlewares/settings/readBySettingKey');
const {
  supplierQuoteLastNumberSettingKey,
  normalizeSupplierQuotePrefix,
} = require('@/middlewares/settings/supplierQuoteLastNumberSettingKey');

const LAST_NUMBER_CATEGORY = 'last_number_settings';

const SUPPLIER_LAST_NUMBER_KEYS = [
  'last_supplier_quote_number_no',
  'last_supplier_quote_number_po',
  'last_supplier_quote_number_s',
  'last_supplier_quote_number_swp',
  'last_supplier_quote_number_e',
  'last_supplier_quote_number_y',
];

const QUOTE_LAST_NUMBER_KEYS = ['last_sml_number', 'last_qu_number', 'last_quote_number'];

function parseDocNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return NaN;
  const n = Number(digits);
  return Number.isFinite(n) ? n : NaN;
}

function quoteLastNumberSettingKey(prefix) {
  const p = String(prefix || 'QU').trim().toUpperCase();
  if (p === 'SML') return 'last_sml_number';
  if (p === 'QU') return 'last_qu_number';
  return 'last_quote_number';
}

async function readSettingNumber(settingKey, fallback = 0) {
  const row = await readBySettingKey({ settingKey });
  if (row?.settingValue == null || row.settingValue === '') return fallback;
  const n = Number(row.settingValue);
  return Number.isFinite(n) ? n : fallback;
}

async function readQuoteLastNumber(prefix) {
  const key = quoteLastNumberSettingKey(prefix);
  const primary = await readSettingNumber(key, NaN);
  if (Number.isFinite(primary)) return primary;
  return readSettingNumber('last_quote_number', 0);
}

async function readSupplierQuoteLastNumber(prefix) {
  const key = supplierQuoteLastNumberSettingKey(prefix);
  let last = await readSettingNumber(key, NaN);
  if (Number.isFinite(last)) return last;
  if (normalizeSupplierQuotePrefix(prefix) === 's') {
    last = await readSettingNumber('last_supplier_quote_number', NaN);
    if (Number.isFinite(last)) return last;
  }
  return 0;
}

async function upsertSettingNumber(settingKey, value) {
  const Model = mongoose.model('Setting');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Model.findOneAndUpdate(
    { settingKey },
    {
      $set: { settingValue: n, valueType: 'number' },
      $setOnInsert: { settingCategory: LAST_NUMBER_CATEGORY },
    },
    { new: true, upsert: true, runValidators: true }
  ).exec();
}

async function syncLastNumberAfterUse(settingKey, usedNumber) {
  const used = parseDocNumber(usedNumber);
  if (!Number.isFinite(used)) return null;
  const current = await readSettingNumber(settingKey, 0);
  if (used <= current) return null;
  return upsertSettingNumber(settingKey, used);
}

async function syncQuoteLastNumberAfterUse(prefix, usedNumber) {
  return syncLastNumberAfterUse(quoteLastNumberSettingKey(prefix), usedNumber);
}

async function syncSupplierQuoteLastNumberAfterUse(prefix, usedNumber) {
  return syncLastNumberAfterUse(supplierQuoteLastNumberSettingKey(prefix), usedNumber);
}

async function increaseSupplierQuoteLastNumberByPrefix(prefix) {
  const settingKey = supplierQuoteLastNumberSettingKey(prefix);
  const last = await readSupplierQuoteLastNumber(prefix);
  const next = last + 1;
  await upsertSettingNumber(settingKey, next);
  return { settingKey, settingValue: next };
}

/**
 * 上單／建立 S 單：可指定 numberPrefix + number，否則自動遞增。
 * @param {{ numberPrefix?: string, number?: string }} input
 */
async function resolveSupplierQuoteNumberForCreate(input = {}) {
  const assertSupplierQuoteNumber = require('@/helpers/assertSupplierQuoteNumber');
  const userPrefix = input.numberPrefix ? String(input.numberPrefix).trim().toUpperCase() : '';
  const userNumber = input.number != null ? String(input.number).trim() : '';

  if (userPrefix && userNumber) {
    await assertSupplierQuoteNumber({ numberPrefix: userPrefix, number: userNumber });
    await syncSupplierQuoteLastNumberAfterUse(userPrefix, userNumber);
    return { numberPrefix: userPrefix, number: userNumber };
  }

  const prefix = userPrefix || 'S';
  const inc = await increaseSupplierQuoteLastNumberByPrefix(prefix);
  return { numberPrefix: prefix, number: String(inc.settingValue) };
}

function isLastNumberSettingKey(settingKey) {
  return (
    SUPPLIER_LAST_NUMBER_KEYS.includes(settingKey) ||
    QUOTE_LAST_NUMBER_KEYS.includes(settingKey) ||
    settingKey === 'last_supplier_quote_number'
  );
}

module.exports = {
  LAST_NUMBER_CATEGORY,
  SUPPLIER_LAST_NUMBER_KEYS,
  QUOTE_LAST_NUMBER_KEYS,
  parseDocNumber,
  quoteLastNumberSettingKey,
  readSettingNumber,
  readQuoteLastNumber,
  readSupplierQuoteLastNumber,
  upsertSettingNumber,
  syncLastNumberAfterUse,
  syncQuoteLastNumberAfterUse,
  syncSupplierQuoteLastNumberAfterUse,
  increaseSupplierQuoteLastNumberByPrefix,
  resolveSupplierQuoteNumberForCreate,
  isLastNumberSettingKey,
};
