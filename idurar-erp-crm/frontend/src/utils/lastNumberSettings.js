/** 合併 last_number_settings、finance_settings、supplier_quote_settings 的最後號碼（向後相容） */
export function mergeLastNumberSettings({
  lastNumberSettings = {},
  financeSettings = {},
  supplierQuoteSettings = {},
} = {}) {
  const ln = lastNumberSettings || {};
  const fin = financeSettings || {};
  const sq = supplierQuoteSettings || {};

  const pick = (key, ...fallbacks) => {
    if (ln[key] !== undefined && ln[key] !== null && ln[key] !== '') return Number(ln[key]) || 0;
    for (const fb of fallbacks) {
      if (fb !== undefined && fb !== null && fb !== '') return Number(fb) || 0;
    }
    return 0;
  };

  return {
    last_sml_number: pick('last_sml_number', fin.last_quote_number),
    last_qu_number: pick('last_qu_number', fin.last_quote_number),
    last_quote_number: pick('last_quote_number', fin.last_quote_number),
    last_supplier_quote_number_no: pick('last_supplier_quote_number_no', fin.last_supplier_quote_number_no),
    last_supplier_quote_number_po: pick('last_supplier_quote_number_po', fin.last_supplier_quote_number_po),
    last_supplier_quote_number_s: pick(
      'last_supplier_quote_number_s',
      fin.last_supplier_quote_number_s,
      sq.last_supplier_quote_number
    ),
    last_supplier_quote_number_swp: pick('last_supplier_quote_number_swp', fin.last_supplier_quote_number_swp),
    last_supplier_quote_number_e: pick('last_supplier_quote_number_e', fin.last_supplier_quote_number_e),
    last_supplier_quote_number_y: pick('last_supplier_quote_number_y', fin.last_supplier_quote_number_y),
    last_smi_number: pick('last_smi_number', fin.last_invoice_number),
    last_wse_number: pick('last_wse_number'),
    last_sp_number: pick('last_sp_number'),
    default_quote_supplier_id: (() => {
      const raw = ln.default_quote_supplier_id ?? fin.default_quote_supplier_id;
      if (raw == null || raw === '') return undefined;
      return String(raw);
    })(),
  };
}

export function getSuggestedNextSmiNumber(mergedSettings) {
  return getSuggestedNextInvoiceNumber(mergedSettings, 'SMI');
}

export function invoiceLastNumberSettingKey(prefix) {
  const p = String(prefix || 'SMI').trim().toUpperCase();
  if (p === 'SMI') return 'last_smi_number';
  if (p === 'WSE') return 'last_wse_number';
  if (p === 'SP') return 'last_sp_number';
  return null;
}

export function getSuggestedNextInvoiceNumber(mergedSettings, prefix) {
  const key = invoiceLastNumberSettingKey(prefix);
  if (!key) return 1;
  const last = Number(mergedSettings?.[key]) || 0;
  return last + 1;
}

export function quoteLastNumberSettingKey(prefix) {
  const p = String(prefix || 'QU').trim().toUpperCase();
  if (p === 'SML') return 'last_sml_number';
  if (p === 'QU') return 'last_qu_number';
  return 'last_quote_number';
}

export function supplierQuoteLastNumberSettingKey(prefix) {
  return `last_supplier_quote_number_${String(prefix || 'S').trim().toLowerCase()}`;
}

export function getSuggestedNextNumber(mergedSettings, prefix, kind = 'supplier') {
  const key =
    kind === 'quote' ? quoteLastNumberSettingKey(prefix) : supplierQuoteLastNumberSettingKey(prefix);
  const last = Number(mergedSettings?.[key]) || 0;
  return last + 1;
}

export const SUPPLIER_QUOTE_PREFIX_OPTIONS = [
  { value: 'NO', label: 'NO' },
  { value: 'PO', label: 'PO' },
  { value: 'S', label: 'S' },
  { value: 'SWP', label: 'SWP' },
  { value: 'E', label: 'E' },
  { value: 'Y', label: 'Y' },
];
