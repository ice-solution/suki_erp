const mongoose = require('mongoose');

const ShipQuoteModel = mongoose.model('ShipQuote');
const { aggregateOrderedQtyByShipQuoteLine } = require('@/helpers/quoteSupplierOrderFromQuote');

/**
 * GET /shipquote/po-order-status/:id?poNumber=
 */
const poOrderStatus = async (req, res) => {
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

    const orderedMap = await aggregateOrderedQtyByShipQuoteLine(shipQuote._id, poNumber);
    const headerPo = String(shipQuote.poNumber || '').trim();
    const lines = [];
    (shipQuote.items || []).forEach((item, itemIndex) => {
      const linePo = String(item.poNumber || '').trim() || headerPo;
      if (linePo !== poNumber) return;
      const totalQty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const orderedQty = Math.max(0, Math.floor(Number(orderedMap[itemIndex] || 0)));
      lines.push({
        itemIndex,
        itemName: item.itemName,
        description: item.description,
        unit: item.unit,
        quoteQuantity: totalQty,
        orderedQty,
        remainingQty: Math.max(0, totalQty - orderedQty),
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
    console.error('shipquote poOrderStatus:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Error',
    });
  }
};

module.exports = poOrderStatus;
