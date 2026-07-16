/**
 * 使用 Puppeteer 將 ip.pug（SupplierQuote IP 單，版面同 s.pug）渲染為 PDF。
 *
 * @module new_pdf/supplier_quote/generateSupplierQuoteIPPdf
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

function resolveLogoSettingKeyForSupplierQuoteIP(result) {
  if (result && String(result.numberPrefix || '').toLowerCase() === 'ip') {
    return 'company_logo_ip';
  }
  return null;
}

function resolveIPTemplatePath() {
  const fileNameLower = 'ip.pug';
  const candidates = [
    path.join(__dirname, '../../pdf', fileNameLower),
    path.join(process.cwd(), 'src', 'pdf', fileNameLower),
    path.join(process.cwd(), 'backend', 'src', 'pdf', fileNameLower),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`ip.pug not found. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

/**
 * @param {object} model - SupplierQuote 文件（已 populate 與 pdf 所需欄位）
 * @returns {Promise<Buffer>}
 */
async function generateSupplierQuoteIPPdfBuffer(model) {
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

  const logoKey = resolveLogoSettingKeyForSupplierQuoteIP(model);
  if (logoKey && settings[logoKey]) {
    settings.company_logo = settings[logoKey];
  }

  const templatePath = resolveIPTemplatePath();
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
  generateSupplierQuoteIPPdfBuffer,
};
