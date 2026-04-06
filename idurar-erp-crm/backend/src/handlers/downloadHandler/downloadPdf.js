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

module.exports = downloadPdf = async (req, res, { directory, id }) => {
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

      const fileId = modelName.toLowerCase() + '-' + result._id + '.pdf';
      const folderPath = modelName.toLowerCase();
      const targetLocation = `src/public/download/${folderPath}/${fileId}`;

      if (modelName === 'Quote') {
        const puppeteerBuffer = await tryGenerateQuotePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
          return res.send(puppeteerBuffer);
        }
      }

      if (modelName === 'SupplierQuote') {
        const puppeteerBuffer = await tryGenerateSupplierQuotePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
          return res.send(puppeteerBuffer);
        }
      }

      if (modelName === 'ShipQuote') {
        const puppeteerBuffer = await tryGenerateShipQuotePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
          return res.send(puppeteerBuffer);
        }
      }

      if (modelName === 'Invoice') {
        const puppeteerBuffer = await tryGenerateInvoicePdfBufferWithPuppeteer(result);
        if (puppeteerBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
          return res.send(puppeteerBuffer);
        }
      }

      await custom.generatePdf(
        modelName,
        { filename: folderPath, format: 'A4', targetLocation },
        result,
        async () => {
          return res.download(targetLocation, (error) => {
            if (error)
              return res.status(500).json({
                success: false,
                result: null,
                message: "Couldn't find file",
                error: error.message,
              });
          });
        }
      );
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
