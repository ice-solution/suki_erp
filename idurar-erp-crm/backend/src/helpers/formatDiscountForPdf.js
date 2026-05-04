const currency = require('currency.js');

/**
 * PDF 折扣百分比：固定顯示兩位小數（例 10.50%）
 */
function formatDiscountPct(value) {
  const n = Number(value);
  const x = Number.isFinite(n) ? n : 0;
  return x.toFixed(2);
}

/**
 * PDF 折扣金額：固定兩位小數 + 幣別位置（不依設定 cent_precision）
 */
function formatDiscountMoneyForPdf(amount, settings) {
  const n = Number(amount);
  const amt = Number.isFinite(n) ? n : 0;
  const {
    currency_symbol = '',
    currency_position = 'after',
    decimal_sep = '.',
    thousand_sep = ',',
  } = settings || {};
  const formatted = currency(amt, {
    separator: thousand_sep,
    decimal: decimal_sep,
    symbol: '',
    precision: 2,
  }).format();
  return currency_position === 'before'
    ? `${currency_symbol} ${formatted}`.trim()
    : `${formatted} ${currency_symbol}`.trim();
}

module.exports = {
  formatDiscountPct,
  formatDiscountMoneyForPdf,
};
