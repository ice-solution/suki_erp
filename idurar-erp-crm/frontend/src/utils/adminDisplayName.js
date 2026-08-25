export function adminDisplayName(admin) {
  if (!admin || typeof admin !== 'object') return '';
  const name = `${admin.name || ''}${admin.surname ? ` ${admin.surname}` : ''}`.trim();
  return name || admin.email || '';
}

function resolveAdminId(adminOrId) {
  if (!adminOrId) return '';
  if (typeof adminOrId === 'object') return String(adminOrId._id || adminOrId.id || '');
  return String(adminOrId);
}

/** 跟單人列表中的自訂顯示名稱 */
export function followUpCustomName(adminOrId, followUpPersonList = []) {
  const id = resolveAdminId(adminOrId);
  if (!id || !Array.isArray(followUpPersonList) || followUpPersonList.length === 0) return '';
  const hit = followUpPersonList.find((p) => String(p.adminId) === id);
  const name = hit?.displayName != null ? String(hit.displayName).trim() : '';
  return name;
}

/** 四大單據：優先跟單人自訂名／帳號名，舊資料 fallback 制單人 */
export function followUpDisplayName(record, followUpPersonList = []) {
  const custom =
    followUpCustomName(record?.followUpBy, followUpPersonList) ||
    followUpCustomName(record?.createdBy, followUpPersonList);
  if (custom) return custom;
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
export function projectFollowUpDisplayName(record, followUpPersonList = []) {
  const docs = [
    ...(record?.quotations || []),
    ...(record?.shipQuotations || []),
    ...(record?.invoices || []),
    ...(record?.supplierQuotations || []),
  ];
  const quoteNo = record?.invoiceNumber != null ? String(record.invoiceNumber).trim() : '';
  const matched = quoteNo ? docs.find((d) => relatedDocNumber(d) === quoteNo) : null;
  if (matched) {
    const name = followUpDisplayName(matched, followUpPersonList);
    if (name && name !== '-') return name;
  }
  for (const d of docs) {
    const name = followUpDisplayName(d, followUpPersonList);
    if (name && name !== '-') return name;
  }
  const createdCustom = followUpCustomName(record?.createdBy, followUpPersonList);
  if (createdCustom) return createdCustom;
  return adminDisplayName(record?.createdBy) || '-';
}
