/**
 * ShipQuote（吊船報價）：依 shipType 選 rental / renewal pug，一律 Puppeteer。
 */
const { generateShipQuotePdfBuffer } = require('./generateShipQuotePdf');

/**
 * @param {import('mongoose').Document} doc - ShipQuote
 * @returns {Promise<Buffer|null>}
 */
async function tryGenerateShipQuotePdfBufferWithPuppeteer(doc) {
  if (!doc) return null;
  return generateShipQuotePdfBuffer(doc);
}

module.exports = {
  tryGenerateShipQuotePdfBufferWithPuppeteer,
};
