export function adminDisplayName(admin) {
  if (!admin || typeof admin !== 'object') return '';
  const name = `${admin.name || ''}${admin.surname ? ` ${admin.surname}` : ''}`.trim();
  return name || admin.email || '';
}

/** 四大單據：優先跟單人，舊資料 fallback 制單人 */
export function followUpDisplayName(record) {
  return adminDisplayName(record?.followUpBy) || adminDisplayName(record?.createdBy) || '-';
}

function relatedDocNumber(doc) {
  if (!doc || typeof doc !== 'object') return '';
  if (doc.invoiceNumber != null && String(doc.invoiceNumber).trim()) {
    return String(doc.invoiceNumber).trim();
  }
  if (doc.numberPrefix && doc.number != null) {
    return `${doc.numberPrefix}-${doc.number}`;
  }
  return '';
}

/** 項目列表：優先對應 Quote Number 的單據跟單人 */
export function projectFollowUpDisplayName(record) {
  const docs = [
    ...(record?.quotations || []),
    ...(record?.shipQuotations || []),
    ...(record?.invoices || []),
    ...(record?.supplierQuotations || []),
  ];
  const quoteNo = record?.invoiceNumber != null ? String(record.invoiceNumber).trim() : '';
  const matched = quoteNo ? docs.find((d) => relatedDocNumber(d) === quoteNo) : null;
  if (matched) {
    const name = followUpDisplayName(matched);
    if (name && name !== '-') return name;
  }
  for (const d of docs) {
    const name = followUpDisplayName(d);
    if (name && name !== '-') return name;
  }
  return adminDisplayName(record?.createdBy) || '-';
}
