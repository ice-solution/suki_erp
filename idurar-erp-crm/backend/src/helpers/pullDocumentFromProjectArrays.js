const mongoose = require('mongoose');

/**
 * 從所有專案的 quotations / supplierQuotations / shipQuotations / invoices 陣列移除指定單據 _id
 * （軟刪除時斷開與 Project management 的連結）
 */
async function pullDocumentFromProjectArrays(documentId) {
  if (!documentId) return 0;

  const Project = mongoose.model('Project');
  const id = mongoose.Types.ObjectId.isValid(documentId)
    ? new mongoose.Types.ObjectId(documentId)
    : documentId;

  const res = await Project.updateMany(
    {
      removed: false,
      $or: [
        { quotations: id },
        { supplierQuotations: id },
        { shipQuotations: id },
        { invoices: id },
      ],
    },
    {
      $pull: {
        quotations: id,
        supplierQuotations: id,
        shipQuotations: id,
        invoices: id,
      },
      $set: { updated: new Date(), modified_at: new Date() },
    }
  );

  return res.modifiedCount || 0;
}

module.exports = { pullDocumentFromProjectArrays };
