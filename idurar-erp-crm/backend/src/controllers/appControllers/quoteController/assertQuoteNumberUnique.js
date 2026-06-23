const { assertSharedQuoteNumberUnique } = require('@/helpers/assertSharedQuoteNumberUnique');

/**
 * @param {import('mongoose').Model} _QuoteModel 保留參數以相容舊呼叫
 * @param {object} body
 * @param {string} [excludeMongoId]
 */
async function assertQuoteNumberUnique(_QuoteModel, body, excludeMongoId) {
  return assertSharedQuoteNumberUnique('quote', body, excludeMongoId);
}

module.exports = assertQuoteNumberUnique;
