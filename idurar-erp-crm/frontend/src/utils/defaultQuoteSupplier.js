/** 報價單／吊船報價建立時，未選供應商時的預設商戶名稱（與 DB 列表比對） */
export const DEFAULT_QUOTE_SUPPLIER_NAME = '興成';

function normalizeSupplierName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '');
}

/**
 * @param {Array<{ value?: string, _id?: string, label?: string, name?: string }>} supplierOptions
 * @param {{ preferredId?: string, preferredName?: string }} [options]
 */
export function findDefaultQuoteSupplierId(supplierOptions, { preferredId, preferredName } = {}) {
  if (!Array.isArray(supplierOptions) || supplierOptions.length === 0) return undefined;

  if (preferredId) {
    const byId = supplierOptions.find((o) => String(o.value ?? o._id) === String(preferredId));
    if (byId) return byId.value ?? byId._id;
  }

  const nameCandidates = [preferredName, DEFAULT_QUOTE_SUPPLIER_NAME].filter(Boolean);
  for (const candidate of nameCandidates) {
    const target = normalizeSupplierName(candidate);
    const exact = supplierOptions.find((o) => {
      const label = o.label ?? o.name;
      return label && normalizeSupplierName(label) === target;
    });
    if (exact) return exact.value ?? exact._id;
  }

  const primary = normalizeSupplierName(preferredName || DEFAULT_QUOTE_SUPPLIER_NAME);
  const loose = supplierOptions.find((o) => {
    const label = normalizeSupplierName(o.label ?? o.name);
    return label && (label.includes(primary) || primary.includes(label));
  });
  return loose?.value ?? loose?._id;
}

/**
 * 僅在表單尚未選供應商時寫入預設值（從供應商列表依設定名稱比對，非硬編 ID）。
 * @param {import('antd').FormInstance} form
 * @param {object} [financeSettings] redux finance_settings（可含 default_quote_supplier_name / default_quote_supplier_id）
 */
export function applyDefaultQuoteSupplierOnCreate(form, supplierOptions, { current, financeSettings } = {}) {
  if (!form) return;

  const existingSupplier =
    current?.supplier?._id || current?.supplier || form.getFieldValue('supplier');
  if (existingSupplier) return;

  const id = findDefaultQuoteSupplierId(supplierOptions, {
    preferredId: financeSettings?.default_quote_supplier_id,
    preferredName: financeSettings?.default_quote_supplier_name,
  });
  if (id) form.setFieldsValue({ supplier: id });
}
