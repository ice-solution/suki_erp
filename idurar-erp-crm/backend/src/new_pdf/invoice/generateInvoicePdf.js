/**
 * 使用 Puppeteer 將發票模板（smi / wse / invoice）渲染為 PDF。
 * 與 pdfController：SMI→smi、WSE→wse、其餘（含 SP）→invoice；Logo 用預設 company_logo。
 *
 * @module new_pdf/invoice/generateInvoicePdf
 */

const fs = require('fs');
const path = require('path');
const pug = require('pug');
const moment = require('moment');
const puppeteer = require('puppeteer');

const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
const {
  buildStandardQuoteFooterTemplate,
  buildSuperMaxImageFooterTemplate,
} = require('../shared/quotePdfFooterTemplate');

/** 與 pdfController 內 Invoice 模板選擇一致 */
function resolveInvoiceTemplateBasename(model) {
  if (model && model.numberPrefix === 'SMI') {
    return 'smi';
  }
  if (model && model.numberPrefix === 'WSE') {
    return 'wse';
  }
  return 'invoice';
}

function resolveInvoiceTemplatePath(model) {
  const base = resolveInvoiceTemplateBasename(model);
  const fileNameLower = `${base}.pug`;
  const candidates = [
    path.join(__dirname, '../../pdf', fileNameLower),
    path.join(process.cwd(), 'src', 'pdf', fileNameLower),
    path.join(process.cwd(), 'backend', 'src', 'pdf', fileNameLower),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`${fileNameLower} not found. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

/**
 * @param {object} model - Invoice 文件（已 populate 與 pdf 所需欄位）
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePdfBuffer(model) {
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

  const templatePath = resolveInvoiceTemplatePath(model);
  const htmlContent = pug.renderFile(templatePath, {
    model,
    settings,
    translate,
    dateFormat,
    moneyFormatter,
    moment,
    isPuppeteer: true,
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

    const isSmi = resolveInvoiceTemplateBasename(model) === 'smi';
    const footerTemplate = isSmi
      ? buildSuperMaxImageFooterTemplate(settings.public_server_file)
      : buildStandardQuoteFooterTemplate();

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      scale: 1.3,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate,
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
  generateInvoicePdfBuffer,
};
