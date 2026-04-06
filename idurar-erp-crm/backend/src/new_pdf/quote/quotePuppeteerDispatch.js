/**
 * Quote PDF：依 numberPrefix 分派至各獨立 Puppeteer 產生器（每個 pug／格式一檔，可再擴充）。
 * 一律回傳 Buffer；失敗時由上層 catch。
 */
const { generateSmlQuotePdfBuffer } = require('../new_sml/generateSmlQuotePdf');
const { generateDefaultQuotePdfBuffer } = require('../new_quote/generateDefaultQuotePdf');

/**
 * @param {import('mongoose').Document} quoteDoc - 已 populate 所需欄位之 Quote
 * @returns {Promise<Buffer|null>}
 */
async function tryGenerateQuotePdfBufferWithPuppeteer(quoteDoc) {
  if (!quoteDoc || quoteDoc.removed) return null;

  switch (quoteDoc.numberPrefix) {
    case 'SML':
      return generateSmlQuotePdfBuffer(quoteDoc);
    default:
      return generateDefaultQuotePdfBuffer(quoteDoc);
  }
}

module.exports = {
  tryGenerateQuotePdfBufferWithPuppeteer,
};
