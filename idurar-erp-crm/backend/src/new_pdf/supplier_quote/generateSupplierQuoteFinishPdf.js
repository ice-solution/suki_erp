/**
 * 使用 Puppeteer 將 finish.pug（SupplierQuote 完工單，版面同 s.pug）渲染為 PDF。
 * 適用 numberPrefix：S、NO、SWP、Y
 *
 * @module new_pdf/supplier_quote/generateSupplierQuoteFinishPdf
 */

const fs = require('fs');
const path = require('path');
const pug = require('pug');
const moment = require('moment');
const puppeteer = require('puppeteer');

const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
const { buildSuperMaxImageFooterTemplate } = require('../shared/quotePdfFooterTemplate');

const FINISH_PDF_PREFIXES = new Set(['S', 'NO', 'SWP', 'Y', 'IP']);

function resolveLogoSettingKeyForFinish(result) {
  const prefix = String(result?.numberPrefix || '').toLowerCase();
  if (['s', 'no', 'swp', 'y', 'ip'].includes(prefix)) {
    return `company_logo_${prefix}`;
  }
  return null;
}

function resolveFinishTemplatePath() {
  const fileNameLower = 'finish.pug';
  const candidates = [
    path.join(__dirname, '../../pdf', fileNameLower),
    path.join(process.cwd(), 'src', 'pdf', fileNameLower),
    path.join(process.cwd(), 'backend', 'src', 'pdf', fileNameLower),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`finish.pug not found. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

function isFinishPdfPrefix(numberPrefix) {
  return FINISH_PDF_PREFIXES.has(String(numberPrefix || '').trim().toUpperCase());
}

/**
 * 完工單聯絡人／工程地址：若 S 單未存，則從來源報價單帶出
 */
async function enrichFinishModelFromSourceQuote(model) {
  if (!model) return model;
  const hasContact =
    model.contactPerson != null && String(model.contactPerson).trim() !== '';
  const hasAddress = model.address != null && String(model.address).trim() !== '';
  if (hasContact && hasAddress) return model;

  const mongoose = require('mongoose');
  let source = null;
  try {
    if (model.sourceQuote) {
      const Quote = mongoose.model('Quote');
      const id = model.sourceQuote._id || model.sourceQuote;
      source = await Quote.findById(id).select('contactPerson address').lean();
    } else if (model.sourceShipQuote) {
      const ShipQuote = mongoose.model('ShipQuote');
      const id = model.sourceShipQuote._id || model.sourceShipQuote;
      source = await ShipQuote.findById(id).select('contactPerson address').lean();
    }
  } catch (err) {
    console.error('完工單帶出報價單聯絡人／工程地址失敗:', err);
    return model;
  }
  if (!source) return model;

  const enriched = typeof model.toObject === 'function' ? model.toObject() : { ...model };
  if (!hasContact && source.contactPerson) {
    enriched.contactPerson = source.contactPerson;
  }
  if (!hasAddress && source.address) {
    enriched.address = source.address;
  }
  return enriched;
}

/**
 * @param {object} model - SupplierQuote 文件
 * @returns {Promise<Buffer>}
 */
async function generateSupplierQuoteFinishPdfBuffer(model) {
  if (!isFinishPdfPrefix(model?.numberPrefix)) {
    throw new Error('此 Supplier type 不支援完工單 PDF');
  }

  model = await enrichFinishModelFromSourceQuote(model);

  const settings = await loadSettings();
  const selectedLang = settings['idurar_app_language'];
  const translate = useLanguage({ selectedLang });

  const {
    currency_symbol,
    currency_position,
    decimal_sep,
    thousand_sep,
    cent_precision,
    zero_format,
  } = settings;

  const { moneyFormatter } = useMoney({
    settings: {
      currency_symbol,
      currency_position,
      decimal_sep,
      thousand_sep,
      cent_precision,
      zero_format,
    },
  });
  const { dateFormat } = useDate({ settings });

  settings.public_server_file = process.env.PUBLIC_SERVER_FILE || '';

  const logoKey = resolveLogoSettingKeyForFinish(model);
  if (logoKey && settings[logoKey]) {
    settings.company_logo = settings[logoKey];
  }

  const templatePath = resolveFinishTemplatePath();
  const htmlContent = pug.renderFile(templatePath, {
    model,
    settings,
    translate,
    dateFormat,
    moneyFormatter,
    moment,
    isPuppeteer: true,
    paginationDebug: process.env.S_PDF_PAGINATION_DEBUG === '1',
  });

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOpts);

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'load',
      timeout: 120000,
    });
    await page.emulateMediaType('print');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      scale: 1.3,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: buildSuperMaxImageFooterTemplate(settings.public_server_file),
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '28mm',
        left: '10mm',
      },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateSupplierQuoteFinishPdfBuffer,
  isFinishPdfPrefix,
};
