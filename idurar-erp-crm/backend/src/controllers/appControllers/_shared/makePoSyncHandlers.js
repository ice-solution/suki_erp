const { previewPoNumberSync, executePoNumberSync } = require('@/helpers/poNumberSync');

function makePoSyncHandlers(sourceType) {
  const poSyncPreview = async (req, res) => {
    try {
      const oldPoNumber = req.query.oldPoNumber;
      const result = await previewPoNumberSync({
        sourceType,
        sourceId: req.params.id,
        oldPoNumber,
      });
      return res.status(200).json({
        success: true,
        result,
        message: 'OK',
      });
    } catch (error) {
      console.error(`${sourceType} poSyncPreview:`, error);
      return res.status(400).json({
        success: false,
        result: null,
        message: error.message || 'Error',
      });
    }
  };

  const poSyncExecute = async (req, res) => {
    try {
      const {
        oldPoNumber,
        newPoNumber,
        syncQuote = true,
        syncSupplierQuotes = true,
        syncInvoices = true,
      } = req.body || {};

      const result = await executePoNumberSync({
        sourceType,
        sourceId: req.params.id,
        oldPoNumber,
        newPoNumber,
        syncQuote: !!syncQuote,
        syncSupplierQuotes: !!syncSupplierQuotes,
        syncInvoices: !!syncInvoices,
      });

      return res.status(200).json({
        success: true,
        result,
        message: 'P.O number 已同步更新',
      });
    } catch (error) {
      console.error(`${sourceType} poSyncExecute:`, error);
      return res.status(400).json({
        success: false,
        result: null,
        message: error.message || 'Error',
      });
    }
  };

  return { poSyncPreview, poSyncExecute };
}

module.exports = makePoSyncHandlers;
