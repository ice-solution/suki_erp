/**
 * 使用 Puppeteer 將 s.pug（SupplierQuote S 單／超越工程簽收單）渲染為 PDF。
 *
 * @module new_pdf/supplier_quote/generateSupplierQuoteSPdf
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

/** 與 pdfController.resolveLogoSettingKey('supplierquote', …) 一致：S 單用 company_logo_s */
function resolveLogoSettingKeyForSupplierQuoteS(result) {
  if (result && String(result.numberPrefix || '').toLowerCase() === 's') {
    return 'company_logo_s';
  }
  return null;
}

function resolveSTemplatePath() {
  const fileNameLower = 's.pug';
  const candidates = [
    path.join(__dirname, '../../pdf', fileNameLower),
    path.join(process.cwd(), 'src', 'pdf', fileNameLower),
    path.join(process.cwd(), 'backend', 'src', 'pdf', fileNameLower),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`s.pug not found. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

/**
 * @param {object} model - SupplierQuote 文件（已 populate 與 pdf 所需欄位）
 * @returns {Promise<Buffer>}
 */
async function generateSupplierQuoteSPdfBuffer(model) {
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

  const logoKey = resolveLogoSettingKeyForSupplierQuoteS(model);
  if (logoKey && settings[logoKey]) {
    settings.company_logo = settings[logoKey];
  }

  const templatePath = resolveSTemplatePath();
  const htmlContent = pug.renderFile(templatePath, {
    model,
    settings,
    translate,
    dateFormat,
    moneyFormatter,
    moment,
    isPuppeteer: true,
    /** 設 `S_PDF_PAGINATION_DEBUG=1` 時，s.pug 會在最後多一頁輸出分頁估算 JSON 供檢查 */
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
  generateSupplierQuoteSPdfBuffer,
};
