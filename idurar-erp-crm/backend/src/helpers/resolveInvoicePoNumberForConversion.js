/**
 * 報價類單據轉 Invoice：發票 poNumber 優先來自已選項目之行內 poNumber（去重、順序與選中行一致）；
 * 無則退回來源單表頭 poNumber / poNumbers（與 QuoteTableForm / ShipQuoteTableForm 儲存方式一致）。
 *
 * @param {{ poNumber?: string, poNumbers?: string[] }} sourceDoc - Quote / ShipQuote 等
 * @param {Array<{ poNumber?: string }>} selectedItems - 已選中要轉成發票的明細
 */
function resolveInvoicePoNumberForConversion(sourceDoc, selectedItems) {
  const ordered = [];
  const seen = new Set();
  (selectedItems || []).forEach((item) => {
    if (!item || item.poNumber == null) return;
    const raw = String(item.poNumber).trim();
    if (!raw || seen.has(raw)) return;
    seen.add(raw);
    ordered.push(raw);
  });
  if (ordered.length > 0) {
    return ordered.join(', ');
  }
  if (sourceDoc && sourceDoc.poNumber != null && String(sourceDoc.poNumber).trim() !== '') {
    return String(sourceDoc.poNumber).trim();
  }
  if (sourceDoc && Array.isArray(sourceDoc.poNumbers) && sourceDoc.poNumbers.length > 0) {
    const headerOrdered = [];
    const headerSeen = new Set();
    sourceDoc.poNumbers.forEach((p) => {
      const t = p != null ? String(p).trim() : '';
      if (!t || headerSeen.has(t)) return;
      headerSeen.add(t);
      headerOrdered.push(t);
    });
    if (headerOrdered.length > 0) return headerOrdered.join(', ');
  }
  return '';
}

module.exports = resolveInvoicePoNumberForConversion;
