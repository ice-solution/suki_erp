const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const { convertSourceDocumentToInvoice } = require('@/helpers/convertSourceDocumentToInvoice');

/**
 * POST：body { poNumber, conversionMode: 'A'|'B', numberPrefix?, number?, lines?: [...] }
 */
const convertQuoteToInvoice = async (req, res) => {
  try {
    const quote = await QuoteModel.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    if (!quote.items || quote.items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Quote 沒有項目，無法轉換',
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
      sourceDoc: quote,
      sourceQuoteId: quote._id,
      sourceShipQuoteId: null,
      convertedFrom: 'quote',
      req,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        result: null,
        message: result.message,
      });
    }

    await QuoteModel.findByIdAndUpdate(req.params.id, {
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
    console.error('Error converting quote to invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting quote to invoice: ' + error.message,
    });
  }
};

module.exports = convertQuoteToInvoice;
