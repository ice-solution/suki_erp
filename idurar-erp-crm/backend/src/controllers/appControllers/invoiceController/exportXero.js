const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');
const { parseHongKongDayRange } = require('@/helpers/hongKongMoment');
const { parseQuoteNumberForSort } = require('../../../helpers/paginatedQuoteSort');

/** 發票次序：SMI → SP → WSE，其餘排後 */
const INVOICE_PREFIX_RANK = { SMI: 0, SP: 1, WSE: 2 };

function compareInvoiceForXeroExport(a, b) {
  const rankA = INVOICE_PREFIX_RANK[a?.numberPrefix] ?? 99;
  const rankB = INVOICE_PREFIX_RANK[b?.numberPrefix] ?? 99;
  if (rankA !== rankB) return rankA - rankB;

  const na = parseQuoteNumberForSort(a?.number);
  const nb = parseQuoteNumberForSort(b?.number);
  // 同 prefix：單號由大到小
  if (nb.num !== na.num) return nb.num - na.num;
  if (nb.suffix !== na.suffix) return nb.suffix.localeCompare(na.suffix);
  return String(b?.number || '').localeCompare(String(a?.number || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * GET /invoice/export-xero?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * 依發票 date 篩選日期範圍（香港日曆日），回傳用於 Xero CSV 滙出的發票列表（含 client/clients 以取得客戶名與 accountCode）
 * 排序：SMI → SP → WSE；同類型單號由大到小
 */
const exportXero = async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'dateFrom and dateTo are required (YYYY-MM-DD)',
      });
    }
    const range = parseHongKongDayRange(dateFrom, dateTo);
    if (!range) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid date format',
      });
    }
    const { from, to } = range;

    const result = await Model.find({
      removed: false,
      date: { $gte: from, $lte: to },
    })
      .populate('client', 'name email accountCode')
      .populate('clients', 'name email accountCode')
      .populate('project', 'name address')
      .lean()
      .exec();

    result.sort(compareInvoiceForXeroExport);

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found invoices for Xero export',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Server error',
    });
  }
};

module.exports = exportXero;
