const mongoose = require('mongoose');
const {
  parseDocNumber,
  readInvoiceLastNumber,
} = require('@/helpers/lastNumberSettings');

const VALID_INVOICE_PREFIXES = new Set(['SMI', 'WSE', 'SP']);

async function assertInvoiceNumber(body, excludeMongoId, options = {}) {
  const { enforceLastNumber = true } = options;
  const prefix = String(body?.numberPrefix || 'SMI').trim().toUpperCase();
  const number = body?.number != null ? String(body.number).trim() : '';

  if (!VALID_INVOICE_PREFIXES.has(prefix)) {
    const err = new Error('發票類型須為 SMI、WSE 或 SP');
    err.statusCode = 400;
    throw err;
  }

  if (!number) {
    const err = new Error('請輸入發票編號');
    err.statusCode = 400;
    throw err;
  }

  const numVal = parseDocNumber(number);
  if (!Number.isFinite(numVal) || numVal <= 0) {
    const err = new Error('發票編號格式無效');
    err.statusCode = 400;
    throw err;
  }

  const Model = mongoose.model('Invoice');
  const dupFilter = { removed: false, numberPrefix: prefix, number };
  if (excludeMongoId) dupFilter._id = { $ne: excludeMongoId };

  const dup = await Model.findOne(dupFilter).select('_id numberPrefix number').lean();
  if (dup) {
    const err = new Error(`發票編號 ${prefix}-${number} 已存在`);
    err.statusCode = 400;
    throw err;
  }

  const last = await readInvoiceLastNumber(prefix);
  if (enforceLastNumber && numVal <= last) {
    const err = new Error(
      `發票編號須大於最後號碼（${prefix}：${last}），建議使用 ${last + 1}`
    );
    err.statusCode = 400;
    throw err;
  }

  return { prefix, number, numVal };
}

module.exports = assertInvoiceNumber;
