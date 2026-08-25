/**
 * SupplierQuote PDF：S／Y／IH／SWP 使用 Puppeteer + s.pug 簽收單版面；其餘回傳 null 改走 html-pdf。
 */
const { generateSupplierQuoteSPdfBuffer } = require('./generateSupplierQuoteSPdf');
const { generateSupplierQuoteIPPdfBuffer } = require('./generateSupplierQuoteIPPdf');
const { generateWingShunNoPdfBuffer } = require('./generateWingShunNoPdf');

/**
 * @param {import('mongoose').Document} doc - SupplierQuote
 * @returns {Promise<Buffer|null>}
 */
async function tryGenerateSupplierQuotePdfBufferWithPuppeteer(doc) {
  if (!doc) return null;
  // Y／IH／SWP 與 S 相同簽收單版面（s.pug）
  if (
    doc.numberPrefix === 'S' ||
    doc.numberPrefix === 'Y' ||
    doc.numberPrefix === 'IH' ||
    doc.numberPrefix === 'SWP'
  ) {
    return generateSupplierQuoteSPdfBuffer(doc);
  }
  if (doc.numberPrefix === 'IP') {
    return generateSupplierQuoteIPPdfBuffer(doc);
  }
  if (doc.numberPrefix === 'NO') {
    return generateWingShunNoPdfBuffer(doc);
  }
  return null;
}

module.exports = {
  tryGenerateSupplierQuotePdfBufferWithPuppeteer,
};
