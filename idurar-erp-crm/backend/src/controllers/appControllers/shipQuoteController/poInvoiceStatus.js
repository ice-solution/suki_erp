const mongoose = require('mongoose');

const ShipQuoteModel = mongoose.model('ShipQuote');
const { aggregateInvoicedQtyByShipQuoteLine } = require('@/helpers/quoteInvoiceFromQuote');
const {
  computeSourceDiscountedTotal,
  detectLockedInvoiceConversionMode,
  aggregateInvoicedPercentageBySource,
} = require('@/helpers/quoteInvoiceConversion');

/**
 * GET /shipquote/po-invoice-status/:id?poNumber=
 */
const poInvoiceStatus = async (req, res) => {
  try {
    const shipQuote = await ShipQuoteModel.findById(req.params.id);
    if (!shipQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Ship Quote not found',
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

    const invoicedMap = await aggregateInvoicedQtyByShipQuoteLine(shipQuote._id, poNumber);
    const headerPo = String(shipQuote.poNumber || '').trim();
    const lines = [];
    (shipQuote.items || []).forEach((item, itemIndex) => {
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

    const lockedMode = await detectLockedInvoiceConversionMode(null, shipQuote._id);
    const invoicedPercentage = await aggregateInvoicedPercentageBySource(null, shipQuote._id);
    const quoteDiscountedTotal = computeSourceDiscountedTotal(shipQuote);

    return res.status(200).json({
      success: true,
      result: {
        poNumber,
        lines,
        lockedConversionMode: lockedMode,
        quoteDiscountedTotal,
        invoicedPercentage,
        remainingPercentage: Math.max(0, Math.round((100 - invoicedPercentage) * 100) / 100),
      },
      message: 'OK',
    });
  } catch (error) {
    console.error('shipquote poInvoiceStatus:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Error',
    });
  }
};

module.exports = poInvoiceStatus;
