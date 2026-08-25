const mongoose = require('mongoose');

const InvoiceModel = mongoose.model('Invoice');
const QuoteModel = mongoose.model('Quote');
const ShipQuoteModel = mongoose.model('ShipQuote');

const {
  aggregateInvoicedQtyByQuoteLine,
  aggregateInvoicedQtyByShipQuoteLine,
} = require('@/helpers/quoteInvoiceFromQuote');
const { inferInvoiceConversionMode } = require('@/helpers/quoteInvoiceConversion');

function normalizeQty(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

function linePoNumber(item, headerPo) {
  return String(item?.poNumber || '').trim() || headerPo;
}

/**
 * 編輯由報價轉出的發票時：取得來源項次與本單可用開票餘額（同 S 單 source-items）。
 */
async function getSourceItemsForEdit(req, res) {
  const invoice = await InvoiceModel.findOne({
    _id: req.params.id,
    removed: false,
  })
    .select(
      'sourceQuote sourceShipQuote orderFromPoNumber poNumber orderFromQuoteLines invoiceNumber invoiceConversionMode'
    )
    .lean()
    .exec();

  if (!invoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  if (inferInvoiceConversionMode(invoice) === 'B') {
    return res.status(200).json({
      success: true,
      result: {
        sourceType: null,
        sourceId: null,
        sourceNumber: invoice.invoiceNumber || '',
        poNumber: '',
        conversionMode: 'B',
        items: [],
      },
      message: 'B 模式發票以專案佔比計算，不提供數量餘額項次',
    });
  }

  const poNumber = String(invoice.orderFromPoNumber || invoice.poNumber || '').trim();
  if (!poNumber) {
    return res.status(400).json({
      success: false,
      result: null,
      message: '此發票未設定來源 P.O. Number',
    });
  }

  const isFromQuote = !!invoice.sourceQuote;
  const isFromShipQuote = !!invoice.sourceShipQuote;
  if (!isFromQuote && !isFromShipQuote) {
    return res.status(200).json({
      success: true,
      result: {
        sourceType: null,
        sourceId: null,
        sourceNumber: invoice.invoiceNumber || '',
        poNumber,
        conversionMode: 'A',
        items: [],
      },
      message: '此發票沒有來源報價單',
    });
  }

  const SourceModel = isFromQuote ? QuoteModel : ShipQuoteModel;
  const sourceId = isFromQuote ? invoice.sourceQuote : invoice.sourceShipQuote;
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

  const invoicedMapAll = isFromQuote
    ? await aggregateInvoicedQtyByQuoteLine(sourceDoc._id, poNumber)
    : await aggregateInvoicedQtyByShipQuoteLine(sourceDoc._id, poNumber);

  const oldQtyByLine = {};
  for (const line of invoice.orderFromQuoteLines || []) {
    const idx = normalizeQty(line?.itemIndex);
    const qty = normalizeQty(line?.quantity);
    oldQtyByLine[idx] = (oldQtyByLine[idx] || 0) + qty;
  }

  const items = (sourceDoc.items || []).map((item, index) => {
    const itemPoNumber = linePoNumber(item, headerPo);
    const matchesPo = itemPoNumber === poNumber;
    const totalQty = normalizeQty(item?.quantity);
    const invoicedAll = matchesPo ? normalizeQty(invoicedMapAll[index] || 0) : 0;
    const invoicedOthers = matchesPo
      ? Math.max(0, invoicedAll - normalizeQty(oldQtyByLine[index] || 0))
      : 0;
    const remainingForThisDoc = matchesPo ? Math.max(0, totalQty - invoicedOthers) : 0;

    return {
      itemNo: index + 1,
      itemIndex: index,
      itemName: item?.itemName || '',
      description: item?.description || '',
      unit: item?.unit || 'JOB',
      price: item?.price != null ? Number(item.price) : 0,
      poNumber: itemPoNumber,
      matchesPo,
      totalQty,
      orderedOthers: invoicedOthers,
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
      conversionMode: 'A',
      items,
    },
    message: '成功取得來源報價項目',
  });
}

module.exports = getSourceItemsForEdit;
