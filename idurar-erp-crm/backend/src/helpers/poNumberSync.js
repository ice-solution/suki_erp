const mongoose = require('mongoose');

const QuoteModel = () => mongoose.model('Quote');
const ShipQuoteModel = () => mongoose.model('ShipQuote');
const SupplierQuoteModel = () => mongoose.model('SupplierQuote');
const InvoiceModel = () => mongoose.model('Invoice');

function normalizePo(value) {
  return String(value ?? '').trim();
}

function linePoNumber(item, headerPo) {
  return normalizePo(item?.poNumber) || normalizePo(headerPo);
}

function splitHeaderPoList(headerPoRaw) {
  const raw = normalizePo(headerPoRaw);
  if (!raw) return [];
  if (raw.includes(',')) {
    return raw.split(',').map((p) => normalizePo(p)).filter(Boolean);
  }
  return [raw];
}

function headerPoListFromDoc(doc) {
  const parts = [];
  const seen = new Set();
  const push = (v) => {
    const s = normalizePo(v);
    if (!s || seen.has(s)) return;
    seen.add(s);
    parts.push(s);
  };
  if (Array.isArray(doc?.poNumbers)) {
    doc.poNumbers.forEach(push);
  }
  splitHeaderPoList(doc?.poNumber).forEach(push);
  return parts;
}

function resolveHeaderPoForLines(doc) {
  const list = headerPoListFromDoc(doc);
  return list[0] || normalizePo(doc?.poNumber);
}

function quoteLineUsesPo(doc, itemIndex, oldPo) {
  const old = normalizePo(oldPo);
  if (!old) return false;
  const items = doc?.items || [];
  const item = items[itemIndex];
  if (!item) return false;
  return linePoNumber(item, resolveHeaderPoForLines(doc)) === old;
}

function buildSupplierQuotePoFilter(sourceType, sourceId, oldPo) {
  const old = normalizePo(oldPo);
  const oid = new mongoose.Types.ObjectId(String(sourceId));
  const sourceField = sourceType === 'quote' ? 'sourceQuote' : 'sourceShipQuote';
  return {
    removed: false,
    [sourceField]: oid,
    $or: [{ orderFromPoNumber: old }, { poNumber: old }],
  };
}

function buildInvoicePoFilter(sourceType, sourceId, oldPo) {
  const old = normalizePo(oldPo);
  const oid = new mongoose.Types.ObjectId(String(sourceId));
  const sourceOr =
    sourceType === 'quote'
      ? [{ sourceQuote: oid }, { 'converted.quote': oid }]
      : [{ sourceShipQuote: oid }, { 'converted.shipQuote': oid }];
  return {
    removed: false,
    $and: [{ $or: sourceOr }, { $or: [{ orderFromPoNumber: old }, { poNumber: old }] }],
  };
}

function replacePoInCommaHeader(raw, oldPo, newPo) {
  const old = normalizePo(oldPo);
  const neu = normalizePo(newPo);
  const rawStr = String(raw ?? '').trim();
  if (!rawStr.includes(',')) {
    return normalizePo(rawStr) === old ? neu : rawStr;
  }
  const parts = rawStr.split(',').map((p) => normalizePo(p));
  if (!parts.some((p) => p === old)) return rawStr;
  return parts.map((p) => (p === old ? neu : p)).join(', ');
}

function applyPoRenameOnSourceDoc(doc, oldPo, newPo) {
  const old = normalizePo(oldPo);
  const neu = normalizePo(newPo);
  if (!old || !neu || old === neu) {
    return { changed: false };
  }

  let changed = false;
  const setFields = {};

  if (Array.isArray(doc.poNumbers) && doc.poNumbers.length > 0) {
    const next = doc.poNumbers.map((p) => (normalizePo(p) === old ? neu : p));
    if (JSON.stringify(next) !== JSON.stringify(doc.poNumbers)) {
      setFields.poNumbers = next;
      changed = true;
    }
  }

  if (doc.poNumber != null && String(doc.poNumber).trim() !== '') {
    const nextHeader = replacePoInCommaHeader(doc.poNumber, old, neu);
    if (nextHeader !== String(doc.poNumber).trim()) {
      setFields.poNumber = nextHeader;
      changed = true;
    }
  }

  const nextItems = (doc.items || []).map((item) => {
    const plain = item?.toObject ? item.toObject() : { ...item };
    if (normalizePo(plain.poNumber) === old) {
      changed = true;
      return { ...plain, poNumber: neu };
    }
    return plain;
  });

  if (changed && (doc.items || []).some((item, i) => {
    const plain = item?.toObject ? item.toObject() : item;
    const next = nextItems[i];
    return normalizePo(plain?.poNumber) !== normalizePo(next?.poNumber);
  })) {
    setFields.items = nextItems;
  }

  return { changed, setFields };
}

function summarizeQuotePoImpact(doc, oldPo) {
  const old = normalizePo(oldPo);
  const headerParts = headerPoListFromDoc(doc);
  const headerMatches = headerParts.includes(old);
  const lineIndices = [];
  (doc.items || []).forEach((item, index) => {
    if (quoteLineUsesPo(doc, index, old)) lineIndices.push(index);
  });
  return {
    headerMatches,
    poNumbersMatches: (doc.poNumbers || []).filter((p) => normalizePo(p) === old).length,
    lineCount: lineIndices.length,
    lineIndices,
  };
}

function formatSupplierQuoteRow(row) {
  const prefix = row.numberPrefix || 'S';
  const num = row.number != null ? String(row.number) : '';
  return {
    _id: row._id,
    supplierQuoteNumber: `${prefix}-${num}`,
    poNumber: row.poNumber || '',
    orderFromPoNumber: row.orderFromPoNumber || '',
  };
}

function formatInvoiceRow(row) {
  const prefix = row.numberPrefix || 'SMI';
  const num = row.number != null ? String(row.number) : '';
  return {
    _id: row._id,
    invoiceNumber: `${prefix}-${num}`,
    poNumber: row.poNumber || '',
    orderFromPoNumber: row.orderFromPoNumber || '',
  };
}

async function loadSourceDoc(sourceType, sourceId) {
  const Model = sourceType === 'quote' ? QuoteModel() : ShipQuoteModel();
  const doc = await Model.findOne({ _id: sourceId, removed: false }).exec();
  if (!doc) {
    const label = sourceType === 'quote' ? '報價單' : '吊船報價';
    throw new Error(`${label}不存在`);
  }
  return doc;
}

async function previewPoNumberSync({ sourceType, sourceId, oldPoNumber }) {
  const old = normalizePo(oldPoNumber);
  if (!old) {
    throw new Error('請選擇舊 P.O number');
  }

  const doc = await loadSourceDoc(sourceType, sourceId);
  const quoteImpact = summarizeQuotePoImpact(doc, old);

  const supplierQuotes = await SupplierQuoteModel()
    .find(buildSupplierQuotePoFilter(sourceType, sourceId, old))
    .select('numberPrefix number poNumber orderFromPoNumber')
    .lean();

  const invoices = await InvoiceModel()
    .find(buildInvoicePoFilter(sourceType, sourceId, old))
    .select('numberPrefix number poNumber orderFromPoNumber')
    .lean();

  const quoteNumber =
    doc.numberPrefix && doc.number ? `${doc.numberPrefix}-${doc.number}` : doc.invoiceNumber || '';

  return {
    oldPoNumber: old,
    quoteNumber,
    quote: quoteImpact,
    supplierQuotes: supplierQuotes.map(formatSupplierQuoteRow),
    invoices: invoices.map(formatInvoiceRow),
  };
}

async function applyDownstreamPoUpdates(Model, filter, oldPo, newPo) {
  const old = normalizePo(oldPo);
  const neu = normalizePo(newPo);
  const docs = await Model.find(filter).select('orderFromPoNumber poNumber').lean();
  let modifiedCount = 0;

  for (const doc of docs) {
    const set = {};
    if (normalizePo(doc.orderFromPoNumber) === old) set.orderFromPoNumber = neu;
    if (normalizePo(doc.poNumber) === old) set.poNumber = neu;
    if (Object.keys(set).length === 0) continue;
    await Model.updateOne({ _id: doc._id }, { $set: { ...set, updated: new Date() } });
    modifiedCount += 1;
  }

  return modifiedCount;
}

async function executePoNumberSync({
  sourceType,
  sourceId,
  oldPoNumber,
  newPoNumber,
  syncQuote = true,
  syncSupplierQuotes = true,
  syncInvoices = true,
}) {
  const old = normalizePo(oldPoNumber);
  const neu = normalizePo(newPoNumber);
  if (!old) throw new Error('請選擇舊 P.O number');
  if (!neu) throw new Error('請填寫新 P.O number');
  if (old === neu) throw new Error('新 P.O number 不可與舊 P.O 相同');

  const doc = await loadSourceDoc(sourceType, sourceId);
  const result = {
    oldPoNumber: old,
    newPoNumber: neu,
    quoteUpdated: false,
    supplierQuotesUpdated: 0,
    invoicesUpdated: 0,
  };

  if (syncQuote) {
    const { changed, setFields } = applyPoRenameOnSourceDoc(doc, old, neu);
    if (changed) {
      Object.assign(doc, setFields);
      doc.updated = new Date();
      doc.modified_at = new Date();
      await doc.save();
      result.quoteUpdated = true;
    }
  }

  if (syncSupplierQuotes) {
    result.supplierQuotesUpdated = await applyDownstreamPoUpdates(
      SupplierQuoteModel(),
      buildSupplierQuotePoFilter(sourceType, sourceId, old),
      old,
      neu
    );
  }

  if (syncInvoices) {
    result.invoicesUpdated = await applyDownstreamPoUpdates(
      InvoiceModel(),
      buildInvoicePoFilter(sourceType, sourceId, old),
      old,
      neu
    );
  }

  return result;
}

module.exports = {
  normalizePo,
  linePoNumber,
  previewPoNumberSync,
  executePoNumberSync,
};
