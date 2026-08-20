const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Contractor = mongoose.model('Contractor');
const { resolveContractorAccountCode } = require('@/helpers/projectContractorFees');
const { parseHongKongDayRange } = require('@/helpers/hongKongMoment');

/**
 * GET /project/export-xero-eo?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *
 * 依 usedContractorFees[].date 篩選日期範圍（香港日曆日），並把每個 Project 的 usedContractorFees 轉成
 * Xero EO（Bill）CSV rows 格式所需資料。
 */
const exportXeroEo = async (req, res) => {
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

    // 先不在 DB 層面用 startDate 篩專案，避免專案起始日不在範圍內但實際 EO 日期在範圍內的情況
    const projects = await Project.find({
      removed: false,
    })
      .select('name usedContractorFees contractorFees')
      .lean()
      .exec();

    // 載入全部啟用承辦商；優先用 contractorFees.contractorId 對 accountCode
    const contractors = await Contractor.find({
      removed: false,
      enabled: true,
    })
      .select('name accountCode')
      .lean()
      .exec();

    const result = projects.map((p) => {
      const feeByLineId = new Map(
        (p.contractorFees || [])
          .filter((f) => f?.lineId)
          .map((f) => [String(f.lineId), f])
      );

      const usedContractorFees = (p.usedContractorFees || [])
        // 只匯出有 EO number 且 fee.date 在指定範圍內的記錄
        .filter((fee) => {
          if (!fee?.eoNumber) return false;
          const feeDate = fee?.date ? new Date(fee.date) : null;
          if (!feeDate) return false;
          return feeDate >= from && feeDate <= to;
        })
        .map((fee) => {
          const lineId =
            fee?.contractorFeeLineId != null && String(fee.contractorFeeLineId).trim()
              ? String(fee.contractorFeeLineId).trim()
              : '';
          const linkedFee = lineId ? feeByLineId.get(lineId) : null;
          const contractorId = linkedFee?.contractorId || null;

          return {
            eoNumber: fee.eoNumber,
            invoiceNo: fee.invoiceNo != null ? String(fee.invoiceNo).trim() : '',
            date: fee.date,
            dueDate: fee.dueDate,
            amount: fee.amount,
            contractorName: fee.projectName || '',
            accountCode: resolveContractorAccountCode(
              fee.projectName,
              contractors,
              contractorId
            ),
          };
        });

      return {
        projectId: p._id,
        projectName: p.name || '',
        startDate: p.startDate,
        usedContractorFees,
      };
    });

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found EO data for Xero export',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Server error',
    });
  }
};

module.exports = exportXeroEo;

