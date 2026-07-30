const {
  readQuoteLastNumber,
  readSupplierQuoteLastNumber,
  readInvoiceLastNumber,
  invoiceLastNumberSettingKey,
} = require('@/helpers/lastNumberSettings');
const {
  SUPPLIER_QUOTE_NUMBER_PREFIXES,
} = require('@/middlewares/settings/supplierQuoteLastNumberSettingKey');

/**
 * GET ?kind=quote|invoice|supplier&prefix=SML
 * 即時讀設定中的最後號碼，回傳 last + 1（不遞增、不寫入）。
 * 供建立／編輯表單「使用建議編號」按鈕，避免 Redux 快取過期。
 */
module.exports = async function suggestedNextNumber(req, res) {
  try {
    const kind = String(req.query.kind || '')
      .trim()
      .toLowerCase();
    let prefix = String(req.query.prefix || '').trim().toUpperCase();

    if (!['quote', 'invoice', 'supplier'].includes(kind)) {
      return res.status(400).json({
        success: false,
        message: 'kind 須為 quote、invoice 或 supplier',
      });
    }

    if (kind === 'quote') {
      if (!prefix) prefix = 'SML';
      if (!['SML', 'QU'].includes(prefix)) {
        return res.status(400).json({
          success: false,
          message: '報價單 prefix 須為 SML 或 QU',
        });
      }
      const last = await readQuoteLastNumber(prefix);
      const next = last + 1;
      return res.status(200).json({
        success: true,
        result: { kind, prefix, last, next: String(next) },
      });
    }

    if (kind === 'invoice') {
      if (!prefix) prefix = 'SMI';
      if (!invoiceLastNumberSettingKey(prefix)) {
        return res.status(400).json({
          success: false,
          message: '發票 prefix 須為 SMI、WSE 或 SP',
        });
      }
      const last = await readInvoiceLastNumber(prefix);
      const next = last + 1;
      return res.status(200).json({
        success: true,
        result: { kind, prefix, last, next: String(next) },
      });
    }

    // supplier (S 單)
    if (!prefix) prefix = 'S';
    if (!SUPPLIER_QUOTE_NUMBER_PREFIXES.includes(prefix)) {
      return res.status(400).json({
        success: false,
        message: `S 單 prefix 須為 ${SUPPLIER_QUOTE_NUMBER_PREFIXES.join('／')}`,
      });
    }
    const last = await readSupplierQuoteLastNumber(prefix);
    const next = last + 1;
    return res.status(200).json({
      success: true,
      result: { kind, prefix, last, next: String(next) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || '讀取建議編號失敗',
    });
  }
};
