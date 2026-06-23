const mongoose = require('mongoose');

async function findProjectByQuoteNumber(quoteNumber) {
  const qn = quoteNumber != null ? String(quoteNumber).trim() : '';
  if (!qn) return null;
  const Project = mongoose.model('Project');
  return Project.findOne({ invoiceNumber: qn, removed: false }).select('_id').lean();
}

/**
 * 依 Quote Number 將發票關聯到對應專案（同一關聯單號可有多張發票）。
 */
async function syncInvoiceToProjectsByQuoteNumber(invoiceId, quoteNumber, options = {}) {
  const { previousQuoteNumber, preferredProjectId } = options;
  const Invoice = mongoose.model('Invoice');
  const Project = mongoose.model('Project');

  const qn = quoteNumber != null ? String(quoteNumber).trim() : '';
  const oldQn =
    previousQuoteNumber != null && previousQuoteNumber !== undefined
      ? String(previousQuoteNumber).trim()
      : '';

  if (oldQn && oldQn !== qn) {
    const oldProject = await findProjectByQuoteNumber(oldQn);
    if (oldProject) {
      await Project.updateOne(
        { _id: oldProject._id },
        { $pull: { invoices: invoiceId }, $set: { updated: new Date(), modified_at: new Date() } }
      );
    }
  }

  if (!qn) {
    await Invoice.updateOne({ _id: invoiceId }, { $unset: { project: 1 } });
    return { linkedProjectIds: [] };
  }

  let project = null;
  if (preferredProjectId && mongoose.Types.ObjectId.isValid(String(preferredProjectId))) {
    project = await Project.findOne({
      _id: preferredProjectId,
      invoiceNumber: qn,
      removed: false,
    })
      .select('_id')
      .lean();
  }
  if (!project) {
    project = await findProjectByQuoteNumber(qn);
  }
  if (!project) {
    return { linkedProjectIds: [] };
  }

  await Project.updateOne(
    { _id: project._id },
    {
      $addToSet: { invoices: invoiceId },
      $set: { updated: new Date(), modified_at: new Date() },
    }
  );

  await Invoice.updateOne({ _id: invoiceId }, { $set: { project: project._id } });

  return { linkedProjectIds: [String(project._id)] };
}

module.exports = {
  findProjectByQuoteNumber,
  syncInvoiceToProjectsByQuoteNumber,
};
