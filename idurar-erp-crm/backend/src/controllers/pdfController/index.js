const pug = require('pug');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
let pdf = require('html-pdf');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

const pugFiles = ['invoice', 'offer', 'quote', 'payment', 'sml', 'no', 'po', 'swp', 's', 's-rental', 'e', 'y'];

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
    if (result && result.shipType === '租貨') return 'company_logo_s';
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
    
    // 如果是 SupplierQuote，根據 numberPrefix 選擇模板（S單用簽收單等格式，不用租貨格式）
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
      if (result.shipType === '租貨') {
        templateName = 's-rental';  // 導向吊船租賃報價（租貨格式）
      } else {
        templateName = 'sml';       // 續租或預設用 SML 報價格式
      }
    }

    // 檢查模板是否存在於 pugFiles 中（一律使用小寫檔名，避免 Linux 大小寫敏感導致找不到）
    const templateNameLower = templateName.toLowerCase();
    if (pugFiles.includes(templateNameLower)) {
      const fileName = templateNameLower + '.pug';
      // 依序嘗試多個路徑，以支援不同部署方式（本機 __dirname、從 backend 目錄執行、從專案根目錄執行）
      const candidates = [
        path.join(__dirname, '../../pdf', fileName),
        path.join(process.cwd(), 'src', 'pdf', fileName),
        path.join(process.cwd(), 'backend', 'src', 'pdf', fileName),
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
    }
  } catch (error) {
    throw new Error(error);
  }
};
