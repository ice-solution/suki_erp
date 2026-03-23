const pug = require('pug');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
let pdf = require('html-pdf');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

// 注意：在不同 OS/部署環境下，pdf 模板檔名大小寫敏感度不同。
// 為避免「只有小寫 pug 檔」時找不到模板，這裡不再以固定清單限制可用模板，
// 而是直接嘗試在候選路徑中尋找實際存在的 .pug 檔案（統一使用小寫檔名）。

/**
 * 依單據類型回傳對應的 logo 設定 key（如 company_logo_no）。
 * 對應：永順 NO/PO、超越 S/SWP、廠用 E、有榮 Y、SML 報價 company_logo_sml。
 * @returns {string|null} setting key 或 null 使用預設 company_logo
 */
function resolveLogoSettingKey(modelName, result) {
  const name = (modelName || '').toLowerCase();
  if (name === 'supplierquote' && result && result.numberPrefix) {
    const prefix = (result.numberPrefix || '').toLowerCase();
    if (['no', 'po', 's', 'swp', 'e', 'y'].includes(prefix)) {
      return `company_logo_${prefix}`;
    }
  }
  if (name === 'quote' && result && result.numberPrefix === 'SML') {
    return 'company_logo_sml';
  }
  if (name === 'shipquote') {
    if (result && result.shipType === '租賃') return 'company_logo_s';
    return 'company_logo_sml';
  }
  return null;
}

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

exports.generatePdf = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5', targetLocation: '' },
  result,
  callback
) => {
  try {
    const { targetLocation } = info;

    // if PDF already exists, then delete it and create a new PDF
    if (fs.existsSync(targetLocation)) {
      fs.unlinkSync(targetLocation);
    }

    // render pdf html

    // Compile Pug template
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

    settings.public_server_file = process.env.PUBLIC_SERVER_FILE;

    // 依單據類型解析使用的 Logo（不同 type 可用不同 logo）
    const logoKey = resolveLogoSettingKey(modelName, result);
    if (logoKey && settings[logoKey]) {
      settings.company_logo = settings[logoKey];
    }

    // 根據 numberPrefix 選擇模板
    let templateName = modelName.toLowerCase();
    
    // 如果是 Quote，根據 numberPrefix 選擇模板
    if ((modelName.toLowerCase() === 'quote' || modelName === 'Quote') && result.numberPrefix) {
      if (result.numberPrefix === 'SML') {
        templateName = 'sml';
      } else {
        // 默認使用 quote 模板
        templateName = 'quote';
      }
    }

    // 如果是 Invoice，根據 numberPrefix 選擇模板
    if ((modelName.toLowerCase() === 'invoice' || modelName === 'Invoice') && result.numberPrefix) {
      if (result.numberPrefix === 'SMI') {
        templateName = 'smi';
      } else if (result.numberPrefix === 'WSE') {
        templateName = 'wse';
      } else {
        templateName = 'invoice';
      }
    }
    
    // 如果是 SupplierQuote，根據 numberPrefix 選擇模板（S單用簽收單等格式，不用租賃格式）
    if ((modelName.toLowerCase() === 'supplierquote' || modelName === 'SupplierQuote') && result.numberPrefix) {
      const prefixMap = {
        'NO': 'no',
        'PO': 'po',
        'SWP': 'swp',
        'S': 's',
        'E': 'e',
        'Y': 'y'
      };
      templateName = prefixMap[result.numberPrefix] || 's';
    }

    // 如果是 ShipQuote（船報價），依 shipType 選擇模板
    if (modelName.toLowerCase() === 'shipquote' || modelName === 'ShipQuote') {
      if (result.shipType === '租賃') {
        templateName = 'shipquote-rental'; // 船報價（吊船租賃）
      } else {
        templateName = 'shipquote-renewal'; // 船報價（吊船續租）
      }
    }

    // 一律使用小寫檔名（避免 Linux 大小寫敏感導致找不到）
    const templateNameLower = (templateName || '').toLowerCase();
    const fileNameLower = templateNameLower + '.pug';

    // 依序嘗試多個路徑，以支援不同部署方式（本機 __dirname、從 backend 目錄執行、從專案根目錄執行）
    const candidates = [
      path.join(__dirname, '../../pdf', fileNameLower),
      path.join(process.cwd(), 'src', 'pdf', fileNameLower),
      path.join(process.cwd(), 'backend', 'src', 'pdf', fileNameLower),
    ];

    let templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      templatePath = candidates[0]; // 錯誤訊息顯示第一個預期路徑
      throw new Error(`Template file not found: ${templatePath}. Tried: ${candidates.join(', ')}`);
    }

    const htmlContent = pug.renderFile(templatePath, {
      model: result,
      settings,
      translate,
      dateFormat,
      moneyFormatter,
      moment: moment,
    });

    pdf
      .create(htmlContent, {
        format: info.format,
        orientation: 'portrait',
        border: '10mm',
      })
      .toFile(targetLocation, function (error) {
        if (error) throw new Error(error);
        if (callback) callback();
      });
  } catch (error) {
    throw new Error(error);
  }
};
