const mongoose = require('mongoose');
const {
  parseDocNumber,
  readSupplierQuoteLastNumber,
} = require('@/helpers/lastNumberSettings');

async function assertSupplierQuoteNumber(body, excludeMongoId) {
  const prefix = String(body?.numberPrefix || 'S').trim().toUpperCase();
  const number = body?.number != null ? String(body.number).trim() : '';

  if (!number) {
    const err = new Error('請輸入 S 單編號');
    err.statusCode = 400;
    throw err;
  }

  const numVal = parseDocNumber(number);
  if (!Number.isFinite(numVal) || numVal <= 0) {
    const err = new Error('S 單編號格式無效');
    err.statusCode = 400;
    throw err;
  }

  const Model = mongoose.model('SupplierQuote');
  const dupFilter = { removed: false, numberPrefix: prefix, number };
  if (excludeMongoId) dupFilter._id = { $ne: excludeMongoId };

  const dup = await Model.findOne(dupFilter).select('_id numberPrefix number').lean();
  if (dup) {
    const err = new Error(`S 單編號 ${prefix}-${number} 已存在`);
    err.statusCode = 400;
    throw err;
  }

  const last = await readSupplierQuoteLastNumber(prefix);
  if (numVal <= last) {
    const err = new Error(
      `S 單編號須大於最後號碼（${prefix}：${last}），建議使用 ${last + 1}`
    );
    err.statusCode = 400;
    throw err;
  }

  return { prefix, number, numVal };
}

module.exports = assertSupplierQuoteNumber;
