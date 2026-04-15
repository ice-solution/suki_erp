const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Contractor = mongoose.model('Contractor');

/**
 * GET /project/export-xero-eo?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *
 * 依 usedContractorFees[].date 篩選日期範圍，並把每個 Project 的 usedContractorFees 轉成
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

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid date format',
      });
    }

    // 當日結束時間
    to.setHours(23, 59, 59, 999);

    // 先不在 DB 層面用 startDate 篩專案，避免專案起始日不在範圍內但實際 EO 日期在範圍內的情況
    const projects = await Project.find({
      removed: false,
    })
      .select('name usedContractorFees')
      .lean()
      .exec();

    // 收集 usedContractorFees 裡所有承辦商名稱（stored in usedContractorFees.projectName）
    const contractorNames = new Set();
    projects.forEach((p) => {
      (p.usedContractorFees || []).forEach((fee) => {
        const feeDate = fee?.date ? new Date(fee.date) : null;
        if (!fee?.eoNumber) return;
        if (!feeDate || feeDate < from || feeDate > to) return;
        if (fee?.projectName) contractorNames.add(fee.projectName);
      });
    });

    // 透過 contractor name 對照 accountCode
    const contractors = await Contractor.find({
      removed: false,
      enabled: true,
      name: { $in: Array.from(contractorNames) },
    })
      .select('name accountCode')
      .lean()
      .exec();

    const accountCodeByName = new Map();
    contractors.forEach((c) => {
      accountCodeByName.set(c.name, c.accountCode || '');
    });

    const result = projects.map((p) => {
      const usedContractorFees = (p.usedContractorFees || [])
        // 只匯出有 EO number 且 fee.date 在指定範圍內的記錄
        .filter((fee) => {
          if (!fee?.eoNumber) return false;
          const feeDate = fee?.date ? new Date(fee.date) : null;
          if (!feeDate) return false;
          return feeDate >= from && feeDate <= to;
        })
        .map((fee) => ({
          eoNumber: fee.eoNumber,
          date: fee.date,
          dueDate: fee.dueDate,
          amount: fee.amount,
          contractorName: fee.projectName || '',
          accountCode: accountCodeByName.get(fee.projectName) || '',
        }));

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

