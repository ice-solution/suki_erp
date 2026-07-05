const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');
const { tryGenerateQuotePdfBufferWithPuppeteer } = require('@/new_pdf/quote/quotePuppeteerDispatch');
const {
  tryGenerateSupplierQuotePdfBufferWithPuppeteer,
} = require('@/new_pdf/supplier_quote/supplierQuotePuppeteerDispatch');
const {
  tryGenerateShipQuotePdfBufferWithPuppeteer,
} = require('@/new_pdf/ship_quote/shipQuotePuppeteerDispatch');
const {
  tryGenerateInvoicePdfBufferWithPuppeteer,
} = require('@/new_pdf/invoice/invoicePuppeteerDispatch');
const {
  generateSupplierQuoteFinishPdfBuffer,
  isFinishPdfPrefix,
} = require('@/new_pdf/supplier_quote/generateSupplierQuoteFinishPdf');

/** 動態 PDF：固定 URL 會被 CDN／瀏覽器快取，導致內容更新後仍下載舊檔 */
function setDynamicPdfCacheHeaders(res) {
  res.setHeader(
    'Cache-Control',
    'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Cloudflare：指示邊緣不要快取此回應（與 Cache-Control 並用較穩）
  res.setHeader('CDN-Cache-Control', 'no-store');
  // 其他 CDN/反向代理常用
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Accel-Expires', '0');
  // 盡量避免協商快取
  try {
    res.removeHeader('ETag');
  } catch (_) {}
}

function sanitizeFilenamePart(input) {
  if (input == null) return '';
  return String(input)
    .trim()
    // Windows/macOS 常見非法字元
    .replace(/[\\/:*?"<>|]/g, '-')
    // 連續空白壓縮
    .replace(/\s+/g, ' ')
    // 避免空字串
    .trim();
}

/**
 * 下載檔名：以 type-number 命名（不影響既有 URL）
 * 例：Quote => SML-0499962.pdf；Invoice => SMI-123.pdf
 */
function buildDownloadFilename(modelName, result, options = {}) {
  const { variant } = options;
  const name = String(modelName || '').toLowerCase();
  const prefix = sanitizeFilenamePart(result?.numberPrefix || '');
  const number = sanitizeFilenamePart(result?.number || '');
  const suffix = variant === 'finish' ? '-finish' : '';

  // 主要單據類型：優先用 numberPrefix-number
  if (prefix && number) {
    return `${prefix}-${number}${suffix}.pdf`;
  }

  // 向後相容：部分資料可能用 invoiceNumber 作為顯示單號
  const invoiceNumber = sanitizeFilenamePart(result?.invoiceNumber || '');
  if (invoiceNumber) {
    return `${invoiceNumber}.pdf`;
  }

  // 後備：至少給一個穩定檔名
  const id = sanitizeFilenamePart(result?._id || '');
  if (id) return `${name || 'document'}-${id}.pdf`;
  return `${name || 'document'}.pdf`;
}

module.exports = downloadPdf = async (req, res, { directory, id, variant } = {}) => {
  try {
    // 處理特殊模型名稱映射
    const modelNameMap = {
      'supplierquote': 'SupplierQuote',
      'shipquote': 'ShipQuote',
      'contractoremployee': 'ContractorEmployee',
      'projectitem': 'ProjectItem',
      'paymentmode': 'PaymentMode',
      'chartofaccounts': 'ChartOfAccounts',
      'journalentry': 'JournalEntry',
      'accountingperiod': 'AccountingPeriod',
      'warehouseinventory': 'WarehouseInventory',
      'warehousetransaction': 'WarehouseTransaction',
      'workprogress': 'WorkProgress',
      'financialreport': 'FinancialReport',
    };
    
    // 如果目錄名稱在映射表中，使用映射值；否則使用標準轉換
    let modelName = modelNameMap[directory.toLowerCase()];
    if (!modelName) {
      modelName = directory.slice(0, 1).toUpperCase() + directory.slice(1);
    }
    
    if (mongoose.models[modelName]) {
      const Model = mongoose.model(modelName);

      let result;
      if (modelName === 'Quote') {
        result = await Model.findOne({
          _id: id,
          removed: false,
        })
          .populate('createdBy', 'name surname email')
          .populate('updatedBy', 'name surname email')
          .exec();
      } else if (modelName === 'SupplierQuote') {
        result = await Model.findOne({
          _id: id,
        })
          .populate('createdBy', 'name surname email')
          .populate('updatedBy', 'name surname email')
          .exec();
      } else if (modelName === 'ShipQuote') {
        result = await Model.findOne({
          _id: id,
        })
          .populate('createdBy', 'name surname email')
          .populate('updatedBy', 'name surname email')
          .exec();
      } else if (modelName === 'Invoice') {
        result = await Model.findOne({
          _id: id,
        })
          .populate('createdBy', 'name surname email')
          .populate('updatedBy', 'name surname email')
          .exec();
      } else {
        result = await Model.findOne({
          _id: id,
        }).exec();
      }

      // Throw error if no result
      if (!result) {
        throw { name: 'ValidationError' };
      }

      setDynamicPdfCacheHeaders(res);

      const fileId = modelName.toLowerCase() + '-' + result._id + '.pdf';
      const downloadFilename = buildDownloadFilename(modelName, result, { variant });
      const folderPath = modelName.toLowerCase();
      const targetLocation = `src/public/download/${folderPath}/${fileId}`;

      if (modelName === 'SupplierQuote' && variant === 'finish') {
        if (!isFinishPdfPrefix(result.numberPrefix)) {
          return res.status(400).json({
            success: false,
            result: null,
            message: '此 Supplier type 不支援下載完工單',
          });
        }
        const finishBuffer = await generateSupplierQuoteFinishPdfBuffer(result);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        return res.send(finishBuffer);
      }

      if (modelName === 'Quote') {
        const puppeteerBuffer = await tryGenerateQuotePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
          return res.send(puppeteerBuffer);
        }
      }

      if (modelName === 'SupplierQuote') {
        const puppeteerBuffer = await tryGenerateSupplierQuotePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
          return res.send(puppeteerBuffer);
        }
      }

      if (modelName === 'ShipQuote') {
        const puppeteerBuffer = await tryGenerateShipQuotePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
          return res.send(puppeteerBuffer);
        }
      }

      if (modelName === 'Invoice') {
        const puppeteerBuffer = await tryGenerateInvoicePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
          return res.send(puppeteerBuffer);
        }
      }

      // fallback：用 html-pdf 直接產生 buffer，避免讀寫磁碟而被誤判「舊檔」
      const buffer = await custom.generatePdfBuffer(modelName, { format: 'A4' }, result);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      return res.send(buffer);
    } else {
      return res.status(404).json({
        success: false,
        result: null,
        message: `Model '${modelName}' does not exist`,
      });
    }
  } catch (error) {
    // If error is thrown by Mongoose due to required validations
    if (error.name == 'ValidationError') {
      return res.status(400).json({
        success: false,
        result: null,
        error: error.message,
        message: 'Required fields are not supplied',
      });
    } else if (error.name == 'BSONTypeError') {
      // If error is thrown by Mongoose due to invalid ID
      return res.status(400).json({
        success: false,
        result: null,
        error: error.message,
        message: 'Invalid ID',
      });
    } else {
      // Server Error
      return res.status(500).json({
        success: false,
        result: null,
        error: error.message,
        message: error.message,
        controller: 'downloadPDF.js',
      });
    }
  }
};
