const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const { aggregateOrderedQtyByQuoteLine } = require('@/helpers/quoteSupplierOrderFromQuote');

/**
 * GET /quote/po-order-status/:id?poNumber=
 * 回傳該 Quote 在指定 P.O 下各行的報價數量、已上單、餘額（供上單 Modal）。
 */
const poOrderStatus = async (req, res) => {
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

    const orderedMap = await aggregateOrderedQtyByQuoteLine(quote._id, poNumber);
    const headerPo = String(quote.poNumber || '').trim();
    const lines = [];
    (quote.items || []).forEach((item, itemIndex) => {
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
    console.error('poOrderStatus:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Error',
    });
  }
};

module.exports = poOrderStatus;
