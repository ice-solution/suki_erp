export function adminDisplayName(admin) {
  if (!admin || typeof admin !== 'object') return '';
  const name = `${admin.name || ''}${admin.surname ? ` ${admin.surname}` : ''}`.trim();
  return name || admin.email || '';
}

/** 四大單據：優先跟單人，舊資料 fallback 制單人 */
export function followUpDisplayName(record) {
  return adminDisplayName(record?.followUpBy) || adminDisplayName(record?.createdBy) || '-';
}
