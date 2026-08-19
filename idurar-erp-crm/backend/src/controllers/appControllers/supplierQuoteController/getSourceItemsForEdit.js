const mongoose = require('mongoose');

const SupplierQuoteModel = mongoose.model('SupplierQuote');
const QuoteModel = mongoose.model('Quote');
const ShipQuoteModel = mongoose.model('ShipQuote');

const {
  aggregateOrderedQtyByQuoteLine,
  aggregateOrderedQtyByShipQuoteLine,
} = require('@/helpers/quoteSupplierOrderFromQuote');

function normalizeQty(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

function linePoNumber(item, headerPo) {
  return String(item?.poNumber || '').trim() || headerPo;
}

async function getSourceItemsForEdit(req, res) {
  const supplierQuote = await SupplierQuoteModel.findOne({
    _id: req.params.id,
    removed: false,
  })
    .select('sourceQuote sourceShipQuote orderFromPoNumber poNumber orderFromQuoteLines invoiceNumber')
    .lean()
    .exec();

  if (!supplierQuote) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Supplier Quote not found',
    });
  }

  const poNumber = String(supplierQuote.orderFromPoNumber || supplierQuote.poNumber || '').trim();
  if (!poNumber) {
    return res.status(400).json({
      success: false,
      result: null,
      message: '此 S 單未設定來源 P.O. Number',
    });
  }

  const isFromQuote = !!supplierQuote.sourceQuote;
  const isFromShipQuote = !!supplierQuote.sourceShipQuote;
  if (!isFromQuote && !isFromShipQuote) {
    return res.status(200).json({
      success: true,
      result: {
        sourceType: null,
        sourceId: null,
        sourceNumber: supplierQuote.invoiceNumber || '',
        poNumber,
        items: [],
      },
      message: '此 S 單沒有來源報價單',
    });
  }

  const SourceModel = isFromQuote ? QuoteModel : ShipQuoteModel;
  const sourceId = isFromQuote ? supplierQuote.sourceQuote : supplierQuote.sourceShipQuote;
  const sourceDoc = await SourceModel.findById(sourceId)
    .select('numberPrefix number invoiceNumber poNumber items')
    .lean()
    .exec();

  if (!sourceDoc) {
    return res.status(404).json({
      success: false,
      result: null,
      message: '來源報價單不存在',
    });
  }

  const sourceNumber =
    sourceDoc.numberPrefix && sourceDoc.number
      ? `${sourceDoc.numberPrefix}-${sourceDoc.number}`
      : sourceDoc.invoiceNumber || '';
  const headerPo = String(sourceDoc.poNumber || '').trim();

  const orderedMapAll = isFromQuote
    ? await aggregateOrderedQtyByQuoteLine(sourceDoc._id, poNumber)
    : await aggregateOrderedQtyByShipQuoteLine(sourceDoc._id, poNumber);

  const oldQtyByLine = {};
  for (const line of supplierQuote.orderFromQuoteLines || []) {
    const idx = normalizeQty(line?.itemIndex);
    const qty = normalizeQty(line?.quantity);
    oldQtyByLine[idx] = (oldQtyByLine[idx] || 0) + qty;
  }

  const items = (sourceDoc.items || []).map((item, index) => {
    const itemPoNumber = linePoNumber(item, headerPo);
    const matchesPo = itemPoNumber === poNumber;
    const totalQty = normalizeQty(item?.quantity);
    const orderedAll = matchesPo ? normalizeQty(orderedMapAll[index] || 0) : 0;
    const orderedOthers = matchesPo ? Math.max(0, orderedAll - normalizeQty(oldQtyByLine[index] || 0)) : 0;
    const remainingForThisDoc = matchesPo ? Math.max(0, totalQty - orderedOthers) : 0;

    return {
      itemNo: index + 1,
      itemIndex: index,
      itemName: item?.itemName || '',
      description: item?.description || '',
      unit: item?.unit || 'JOB',
      poNumber: itemPoNumber,
      matchesPo,
      totalQty,
      orderedOthers,
      remainingForThisDoc,
    };
  });

  return res.status(200).json({
    success: true,
    result: {
      sourceType: isFromQuote ? 'quote' : 'shipquote',
      sourceId: String(sourceDoc._id),
      sourceNumber,
      poNumber,
      items,
    },
    message: '成功取得來源報價項目',
  });
}

module.exports = getSourceItemsForEdit;
