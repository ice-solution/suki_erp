const mongoose = require('mongoose');

const ShipQuoteModel = mongoose.model('ShipQuote');
const { convertSourceDocumentToInvoice } = require('@/helpers/convertSourceDocumentToInvoice');

/**
 * POST：body { poNumber, conversionMode: 'A'|'B', lines?: [{ itemIndex, quantity|percentage }] }
 */
const convertShipQuoteToInvoice = async (req, res) => {
  try {
    const shipQuote = await ShipQuoteModel.findById(req.params.id);
    if (!shipQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'ShipQuote not found',
      });
    }

    if (!shipQuote.items || shipQuote.items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'ShipQuote 沒有項目，無法轉換',
      });
    }

    if (req.method !== 'POST') {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請使用 POST 並提供 poNumber 與 conversionMode',
      });
    }

    const result = await convertSourceDocumentToInvoice({
      sourceDoc: shipQuote,
      sourceQuoteId: null,
      sourceShipQuoteId: shipQuote._id,
      convertedFrom: 'shipQuote',
      req,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        result: null,
        message: result.message,
      });
    }

    await ShipQuoteModel.findByIdAndUpdate(req.params.id, {
      $set: {
        'converted.to': 'invoice',
        'converted.invoice': result.invoice._id,
      },
      $push: {
        'converted.invoices': result.invoice._id,
      },
    });

    return res.status(200).json({
      success: true,
      result: result.invoice,
      message: 'Quote 已成功轉換成 Invoice',
    });
  } catch (error) {
    console.error('Error converting ship quote to invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting ship quote to invoice: ' + error.message,
    });
  }
};

module.exports = convertShipQuoteToInvoice;
