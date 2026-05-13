const mongoose = require('mongoose');

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 以搜尋詞匹配 S 單（address / receiver / Quote number 等），回傳對應的 S 單編號字串（如 S-123），
 * 供 Ship／Winch 列表用 supplierNumber $in 一併篩選。
 */
async function supplierQuoteNumbersMatchingAssetSearchQuery(qRaw) {
  const qTrim = String(qRaw || '').trim();
  if (!qTrim) return [];

  const SupplierQuote = mongoose.model('SupplierQuote');
  const escaped = escapeRegex(qTrim);
  const rx = new RegExp(escaped, 'i');
  const numberPath = SupplierQuote.schema.path('number');
  const numberIsString = numberPath && numberPath.instance === 'String';

  const orClause = [
    { address: { $regex: rx } },
    { receiver: { $regex: rx } },
    { invoiceNumber: { $regex: rx } },
    { poNumber: { $regex: rx } },
    { counterpartyInvoiceNumber: { $regex: rx } },
    { numberPrefix: { $regex: rx } },
  ];
  if (numberIsString) {
    orClause.push({ number: { $regex: rx } });
  } else {
    const nv = parseInt(qTrim, 10);
    if (!Number.isNaN(nv)) orClause.push({ number: nv });
  }
  orClause.push({
    $expr: {
      $regexMatch: {
        input: { $concat: [{ $ifNull: ['$numberPrefix', ''] }, '-', { $toString: '$number' }] },
        regex: escaped,
        options: 'i',
      },
    },
  });

  const docs = await SupplierQuote.find({ removed: false, $or: orClause })
    .select('numberPrefix number')
    .limit(300)
    .lean();

  const nums = new Set();
  for (const doc of docs) {
    const p = doc.numberPrefix || 'S';
    const n = doc.number != null ? String(doc.number) : '';
    nums.add(`${p}-${n}`);
  }
  return [...nums];
}

module.exports = {
  escapeRegex,
  supplierQuoteNumbersMatchingAssetSearchQuery,
};
