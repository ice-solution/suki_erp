const mongoose = require('mongoose');
const { computeSourceDiscountedTotal, roundMoney } = require('@/helpers/quoteInvoiceConversion');

/** 四捨五入至小數點後 2 位 */
function roundHalfUp2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * 發票整個佔比 % = 發票總額 ÷ 專案總額 × 100（小數點後 2 位，四捨五入）
 */
function computeInvoiceProjectPercentage(invoiceTotal, projectTotal) {
  const inv = Number(invoiceTotal);
  const proj = Number(projectTotal);
  if (!Number.isFinite(inv) || !Number.isFinite(proj) || proj <= 0) return null;
  return roundHalfUp2((inv / proj) * 100);
}

function resolveProjectTotalAmount(project, sourceDoc = null) {
  if (project) {
    const projectPrice = Number(project.projectPrice);
    if (Number.isFinite(projectPrice) && projectPrice > 0) return roundMoney(projectPrice);
    const costPrice = Number(project.costPrice);
    if (Number.isFinite(costPrice) && costPrice > 0) return roundMoney(costPrice);
  }
  if (sourceDoc) {
    const fromSource = computeSourceDiscountedTotal(sourceDoc);
    if (fromSource > 0) return fromSource;
  }
  return 0;
}

async function loadProjectForPercentage(projectId) {
  if (!projectId) return null;
  const ProjectModel = mongoose.model('Project');
  return ProjectModel.findOne({ _id: projectId, removed: false })
    .select('projectPrice costPrice')
    .lean();
}

async function applyInvoiceProjectPercentage({ invoiceTotal, projectId, sourceDoc, body = {} }) {
  const project = await loadProjectForPercentage(projectId);
  const projectTotal = resolveProjectTotalAmount(project, sourceDoc);
  const pct = computeInvoiceProjectPercentage(invoiceTotal, projectTotal);
  if (pct != null) {
    body.projectPercentage = pct;
    if (!body.projectPercentageLabel) {
      body.projectPercentageLabel = '整個佔比 (%)';
    }
  }
  return body;
}

module.exports = {
  roundHalfUp2,
  computeInvoiceProjectPercentage,
  resolveProjectTotalAmount,
  loadProjectForPercentage,
  applyInvoiceProjectPercentage,
};
