const mongoose = require('mongoose');
const Model = mongoose.model('SupplierQuote');

/**
 * GET /supplierquote/export-xero-po?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * 依 S單 date 篩選日期範圍，只取 numberPrefix = 'PO' 且 isCompleted = true 的 S單，回傳用於 Xero PO 滙出（含 supplier 以取得供應商名與 accountCode）
 */
const exportXeroPo = async (req, res) => {
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
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid date format',
      });
    }
    to.setHours(23, 59, 59, 999);

    const result = await Model.find({
      removed: false,
      numberPrefix: 'PO',
      isCompleted: true,
      date: { $gte: from, $lte: to },
    })
      .populate('supplier', 'name email accountCode')
      .sort({ date: 1, number: 1 })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found PO supplier quotes for Xero export',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Server error',
    });
  }
};

module.exports = exportXeroPo;
