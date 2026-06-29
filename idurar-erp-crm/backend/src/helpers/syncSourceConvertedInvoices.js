const mongoose = require('mongoose');

function uniqueObjectIds(ids) {
  const seen = new Set();
  const out = [];
  for (const raw of ids || []) {
    if (raw == null || raw === '') continue;
    const s = String(raw._id || raw);
    if (!mongoose.Types.ObjectId.isValid(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}

/**
 * 依仍存在的 Invoice 同步 Quote / ShipQuote 的 converted.invoices、converted.invoice。
 * 若已無任何關聯發票，一併清除 converted.to 與 invoiceConversionMode。
 */
async function syncConvertedInvoicesOnSourceDoc(Model, doc) {
  if (!doc?._id) return doc;

  const Invoice = mongoose.model('Invoice');
  const rawIds = uniqueObjectIds([
    ...(doc.converted?.invoices || []),
    doc.converted?.invoice,
  ]);

  let liveIds = [];
  if (rawIds.length) {
    const live = await Invoice.find({ _id: { $in: rawIds }, removed: false })
      .select('_id created')
      .sort({ created: 1 })
      .lean();
    liveIds = live.map((row) => row._id);
  }

  const currentInvoiceIds = uniqueObjectIds(doc.converted?.invoices || []);
  const currentLegacyId = doc.converted?.invoice ? String(doc.converted.invoice) : null;
  const liveIdStrings = liveIds.map(String);
  const currentIdStrings = currentInvoiceIds.map(String);

  const invoicesChanged =
    currentIdStrings.length !== liveIdStrings.length ||
    currentIdStrings.some((id, index) => id !== liveIdStrings[index]);
  const legacyChanged =
    (currentLegacyId && !liveIdStrings.includes(currentLegacyId)) ||
    (!currentLegacyId && liveIdStrings.length > 0);
  const shouldClearMode = liveIds.length === 0 && doc.invoiceConversionMode;
  const shouldClearTo = liveIds.length === 0 && doc.converted?.to;

  if (!invoicesChanged && !legacyChanged && !shouldClearMode && !shouldClearTo) {
    return doc;
  }

  const patch = {
    'converted.invoices': liveIds,
    updated: new Date(),
  };

  if (liveIds.length) {
    patch['converted.invoice'] = liveIds[liveIds.length - 1];
    patch['converted.to'] = 'invoice';
  } else {
    patch['converted.invoice'] = null;
    patch['converted.to'] = null;
    patch.invoiceConversionMode = null;
  }

  return Model.findByIdAndUpdate(doc._id, { $set: patch }, { new: true }).exec();
}

async function findSourceDocsReferencingInvoice(invoiceId) {
  const Quote = mongoose.model('Quote');
  const ShipQuote = mongoose.model('ShipQuote');
  const oid = invoiceId;

  const [quotes, shipQuotes] = await Promise.all([
    Quote.find({
      removed: false,
      $or: [{ 'converted.invoice': oid }, { 'converted.invoices': oid }],
    })
      .select('_id')
      .lean(),
    ShipQuote.find({
      removed: false,
      $or: [{ 'converted.invoice': oid }, { 'converted.invoices': oid }],
    })
      .select('_id')
      .lean(),
  ]);

  return {
    quoteIds: quotes.map((q) => q._id),
    shipQuoteIds: shipQuotes.map((q) => q._id),
  };
}

/** 刪除 Invoice 後，同步所有仍指向它的報價／吊船報價 converted 欄位。 */
async function syncConvertedInvoicesForDeletedInvoice(invoice) {
  if (!invoice?._id) return;

  const Quote = mongoose.model('Quote');
  const ShipQuote = mongoose.model('ShipQuote');
  const quoteIdSet = new Set();
  const shipQuoteIdSet = new Set();

  if (invoice.sourceQuote) quoteIdSet.add(String(invoice.sourceQuote));
  if (invoice.converted?.quote) quoteIdSet.add(String(invoice.converted.quote));
  if (invoice.sourceShipQuote) shipQuoteIdSet.add(String(invoice.sourceShipQuote));
  if (invoice.converted?.shipQuote) shipQuoteIdSet.add(String(invoice.converted.shipQuote));

  const { quoteIds, shipQuoteIds } = await findSourceDocsReferencingInvoice(invoice._id);
  quoteIds.forEach((id) => quoteIdSet.add(String(id)));
  shipQuoteIds.forEach((id) => shipQuoteIdSet.add(String(id)));

  for (const quoteId of quoteIdSet) {
    const doc = await Quote.findOne({ _id: quoteId, removed: false }).exec();
    if (doc) await syncConvertedInvoicesOnSourceDoc(Quote, doc);
  }
  for (const shipQuoteId of shipQuoteIdSet) {
    const doc = await ShipQuote.findOne({ _id: shipQuoteId, removed: false }).exec();
    if (doc) await syncConvertedInvoicesOnSourceDoc(ShipQuote, doc);
  }
}

module.exports = {
  syncConvertedInvoicesOnSourceDoc,
  syncConvertedInvoicesForDeletedInvoice,
};
