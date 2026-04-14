const mongoose = require('mongoose');

/**
 * 當「Quote Number / 關聯單號」字串變更時，與 project 更新邏輯一致：
 * 同步更新 Quote、SupplierQuote、ShipQuote、Invoice 上對應的 invoiceNumber。
 * 須在更新當前 Invoice 主檔之前呼叫，以便 updateMany 仍以舊字串命中。
 */
async function syncInvoiceNumberAcrossDocuments(oldInvoiceNumber, newInvoiceNumber) {
  const old = oldInvoiceNumber != null ? String(oldInvoiceNumber).trim() : '';
  const neu = newInvoiceNumber != null ? String(newInvoiceNumber).trim() : '';
  if (!old || !neu || old === neu) {
    return {
      quotes: 0,
      supplierQuotes: 0,
      shipQuotes: 0,
      invoices: 0,
    };
  }

  const Quote = mongoose.model('Quote');
  const SupplierQuote = mongoose.model('SupplierQuote');
  const ShipQuote = mongoose.model('ShipQuote');
  const Invoice = mongoose.model('Invoice');

  let oldNumberPrefix = null;
  let oldNumber = null;
  if (old.includes('-')) {
    const parts = old.split('-');
    if (parts.length >= 2) {
      oldNumberPrefix = parts[0];
      oldNumber = parts.slice(1).join('-');
    }
  }

  const oldFindQuery = {
    $or: [{ invoiceNumber: old, removed: false }],
  };
  if (oldNumberPrefix && oldNumber) {
    oldFindQuery.$or.push({
      numberPrefix: oldNumberPrefix,
      number: oldNumber,
      removed: false,
    });
  }

  const payload = { invoiceNumber: neu, updated: new Date() };

  const [q, sq, sh, inv] = await Promise.all([
    Quote.updateMany(oldFindQuery, payload),
    SupplierQuote.updateMany(oldFindQuery, payload),
    ShipQuote.updateMany(oldFindQuery, payload),
    Invoice.updateMany(oldFindQuery, payload),
  ]);

  return {
    quotes: q.modifiedCount || 0,
    supplierQuotes: sq.modifiedCount || 0,
    shipQuotes: sh.modifiedCount || 0,
    invoices: inv.modifiedCount || 0,
  };
}

/**
 * 若專案抬頭的 invoiceNumber 仍為舊單號，一併改為新單號（與單據一致）
 */
async function syncProjectInvoiceNumberIfMatched(projectId, oldInvoiceNumber, newInvoiceNumber) {
  if (!projectId) return false;
  const old = oldInvoiceNumber != null ? String(oldInvoiceNumber).trim() : '';
  const neu = newInvoiceNumber != null ? String(newInvoiceNumber).trim() : '';
  if (!old || !neu || old === neu) return false;

  const Project = mongoose.model('Project');
  const now = new Date();
  const res = await Project.updateOne(
    { _id: projectId, removed: false, invoiceNumber: old },
    { $set: { invoiceNumber: neu, updated: now, modified_at: now } }
  );
  return (res.modifiedCount || 0) > 0;
}

module.exports = {
  syncInvoiceNumberAcrossDocuments,
  syncProjectInvoiceNumberIfMatched,
};
