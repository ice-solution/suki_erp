/**
 * Invoice 發票：依 numberPrefix 選 smi / wse / invoice pug，一律 Puppeteer。
 */
const { generateInvoicePdfBuffer } = require('./generateInvoicePdf');

/**
 * @param {import('mongoose').Document} doc - Invoice
 * @returns {Promise<Buffer|null>}
 */
async function tryGenerateInvoicePdfBufferWithPuppeteer(doc) {
  if (!doc) return null;
  return generateInvoicePdfBuffer(doc);
}

module.exports = {
  tryGenerateInvoicePdfBufferWithPuppeteer,
};
