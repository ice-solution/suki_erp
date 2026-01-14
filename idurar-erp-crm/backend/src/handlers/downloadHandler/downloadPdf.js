const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');

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
      const result = await Model.findOne({
        _id: id,
      }).exec();

      // Throw error if no result
      if (!result) {
        throw { name: 'ValidationError' };
      }

      // Continue process if result is returned

      const fileId = modelName.toLowerCase() + '-' + result._id + '.pdf';
      const folderPath = modelName.toLowerCase();
      const targetLocation = `src/public/download/${folderPath}/${fileId}`;
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
