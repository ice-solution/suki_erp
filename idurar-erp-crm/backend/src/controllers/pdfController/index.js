const pug = require('pug');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
let pdf = require('html-pdf');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

const pugFiles = ['invoice', 'offer', 'quote', 'payment', 'sml', 'no', 'po', 'swp', 's', 'e', 'y'];

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
    
    // 如果是 SupplierQuote，根據 numberPrefix 選擇模板
    if ((modelName.toLowerCase() === 'supplierquote' || modelName === 'SupplierQuote') && result.numberPrefix) {
      const prefixMap = {
        'NO': 'no',
        'PO': 'po',
        'SWP': 'swp',
        'S': 's',
        'E': 'e',
        'Y': 'y'
      };
      templateName = prefixMap[result.numberPrefix] || 's'; // 默認使用 's' 模板
    }

    // 檢查模板是否存在於 pugFiles 中
    if (pugFiles.includes(templateName)) {
      // 使用絕對路徑來確保在構建後也能找到模板文件
      const templatePath = path.join(__dirname, '../../pdf', templateName + '.pug');
      
      // 檢查文件是否存在
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
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
