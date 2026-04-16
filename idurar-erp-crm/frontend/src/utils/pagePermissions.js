export const PAGE_PERMISSION_DEFS = [
  { key: 'dashboard', zh: '儀表板', en: 'Dashboard' },
  { key: 'customer', zh: '客戶', en: 'Customers' },
  { key: 'supplier', zh: '供應商', en: 'Suppliers' },
  { key: 'invoice', zh: '發票', en: 'Invoices' },
  { key: 'quote', zh: '報價單', en: 'Quotes' },
  { key: 'supplierquote', zh: 'S 單（供應商報價）', en: 'Supplier Quotes (S)' },
  { key: 'shipquote', zh: '吊船報價', en: 'Ship Quotes' },
  { key: 'warehouse', zh: '倉存管理', en: 'Warehouse' },
  { key: 'project-list', zh: 'Project Management（列表）', en: 'Projects (List)' },
  { key: 'project-report', zh: 'Project Report', en: 'Project Report' },
  { key: 'project-contractor-report', zh: '承辦商報告', en: 'Contractor Report' },
  { key: 'project-contractor-employee-report', zh: '承辦商員工報告', en: 'Contractor Employee Report' },
  { key: 'quote-operational-report', zh: '報價／發票營運報告', en: 'Quote/Invoice Ops Report' },
  { key: 'xero-invoice', zh: 'Xero 發票滙出', en: 'Xero Invoice Export' },
  { key: 'xero-po', zh: 'Xero PO 單滙出', en: 'Xero PO Export' },
  { key: 'xero-eo', zh: 'Xero EO 單滙出', en: 'Xero EO Export' },
  { key: 'contractor-list', zh: '承辦商', en: 'Contractors' },
  { key: 'contractor-employee', zh: '承辦商員工', en: 'Contractor Employees' },
  { key: 'ship', zh: '船', en: 'Ship' },
  { key: 'winch', zh: '爬攬器', en: 'Winch' },
  { key: 'settings', zh: '設定', en: 'Settings' },
];

export const PAGE_PERMISSION_KEYS = PAGE_PERMISSION_DEFS.map((d) => d.key);

export const PAGE_PERMISSION_OPTIONS = PAGE_PERMISSION_DEFS.map((d) => ({
  value: d.key,
  label: `${d.zh} / ${d.en}`,
}));

export function permissionLabel(key) {
  const found = PAGE_PERMISSION_DEFS.find((d) => d.key === key);
  if (!found) return key;
  return `${found.zh} / ${found.en}`;
}

export function normalizePermissions(perms) {
  if (!Array.isArray(perms)) return null; // null = 未啟用控管（向後相容）
  const set = new Set(perms.map((p) => String(p || '').trim()).filter(Boolean));
  return Array.from(set);
}

export function hasPermission({ perms, key, role }) {
  // Owner/Admin 預設全開
  if (role === 'owner' || role === 'admin') return true;
  const normalized = normalizePermissions(perms);
  if (normalized === null) return true;
  if (key === 'dashboard') return true;
  return normalized.includes(key);
}

