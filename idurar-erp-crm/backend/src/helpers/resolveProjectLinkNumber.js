/**
 * 單據掛 Project 用的關聯鍵：
 * 優先用 Quote Number 欄（invoiceNumber），可與單據編號不同，
 * 以便多張 SML 掛同一個 Project（例如單號 SML-47059，Quote Number = SML-47059R）。
 */
function resolveProjectLinkNumber(doc) {
  if (!doc) return '';
  const fromField = doc.invoiceNumber != null ? String(doc.invoiceNumber).trim() : '';
  if (fromField) return fromField;
  const prefix = doc.numberPrefix != null ? String(doc.numberPrefix).trim() : '';
  const num = doc.number != null ? String(doc.number).trim() : '';
  if (prefix && num) return `${prefix}-${num}`;
  return '';
}

module.exports = { resolveProjectLinkNumber };
