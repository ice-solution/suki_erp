/**
 * SupplierQuote PDF：S 單（numberPrefix === 'S'）使用 Puppeteer + s.pug；其餘回傳 null 改走 html-pdf。
 */
const { generateSupplierQuoteSPdfBuffer } = require('./generateSupplierQuoteSPdf');

/**
 * @param {import('mongoose').Document} doc - SupplierQuote
 * @returns {Promise<Buffer|null>}
 */
async function tryGenerateSupplierQuotePdfBufferWithPuppeteer(doc) {
  if (!doc) return null;
  if (doc.numberPrefix === 'S') {
    return generateSupplierQuoteSPdfBuffer(doc);
  }
  return null;
}

module.exports = {
  tryGenerateSupplierQuotePdfBufferWithPuppeteer,
};
