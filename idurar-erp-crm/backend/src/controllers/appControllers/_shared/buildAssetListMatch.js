const {
  escapeRegex,
  supplierQuoteNumbersMatchingAssetSearchQuery,
} = require('./supplierQuoteNumbersForAssetListSearch');

/**
 * Ship／Winch 列表與 statusSummary 共用之查詢條件（removed、filter、搜尋 q）。
 */
async function buildAssetListMatch(req) {
  const { filter, equal, q, fields: fieldsParam } = req.query;

  const match = { removed: false };
  if (filter && equal !== undefined) match[filter] = equal;

  if (q && fieldsParam) {
    const fieldsArray = fieldsParam
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const qTrim = String(q).trim();
    const rx = new RegExp(escapeRegex(qTrim), 'i');
    const fieldClauses = fieldsArray.map((f) => ({ [f]: { $regex: rx } }));

    let quoteSupplierNumbers = [];
    try {
      quoteSupplierNumbers = await supplierQuoteNumbersMatchingAssetSearchQuery(qTrim);
    } catch (e) {
      quoteSupplierNumbers = [];
    }

    const clauses = [...fieldClauses];
    if (quoteSupplierNumbers.length > 0) {
      clauses.push({ supplierNumber: { $in: quoteSupplierNumbers } });
    }
    if (clauses.length > 0) {
      match.$or = clauses;
    }
  }

  return match;
}

module.exports = buildAssetListMatch;
