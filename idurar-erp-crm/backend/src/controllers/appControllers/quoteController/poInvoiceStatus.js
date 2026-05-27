const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const { aggregateInvoicedQtyByQuoteLine } = require('@/helpers/quoteInvoiceFromQuote');

/**
 * GET /quote/po-invoice-status/:id?poNumber=
 * 回傳該 Quote 在指定 P.O 下各行的報價數量、已開票、餘額（供轉發票 Modal）。
 */
const poInvoiceStatus = async (req, res) => {
  try {
    const quote = await QuoteModel.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    const poNumber = String(req.query.poNumber || '').trim();
    if (!poNumber) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'P.O number is required',
      });
    }

    const invoicedMap = await aggregateInvoicedQtyByQuoteLine(quote._id, poNumber);
    const headerPo = String(quote.poNumber || '').trim();
    const lines = [];
    (quote.items || []).forEach((item, itemIndex) => {
      const linePo = String(item.poNumber || '').trim() || headerPo;
      if (linePo !== poNumber) return;
      const totalQty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const invoicedQty = Math.max(0, Math.floor(Number(invoicedMap[itemIndex] || 0)));
      lines.push({
        itemIndex,
        itemName: item.itemName,
        description: item.description,
        unit: item.unit,
        quoteQuantity: totalQty,
        orderedQty: invoicedQty,
        remainingQty: Math.max(0, totalQty - invoicedQty),
      });
    });

    if (lines.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `No items found with P.O number: ${poNumber}`,
      });
    }

    return res.status(200).json({
      success: true,
      result: { poNumber, lines },
      message: 'OK',
    });
  } catch (error) {
    console.error('poInvoiceStatus:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Error',
    });
  }
};

module.exports = poInvoiceStatus;
