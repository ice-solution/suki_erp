function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 依名稱（trim、不分大小寫）查是否已有未刪除的紀錄。
 * @param {import('mongoose').Model} Model
 * @param {string} name
 * @param {{ excludeId?: string }} [options]
 */
async function findDuplicateByName(Model, name, options = {}) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;

  const q = {
    removed: false,
    name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
  };
  if (options.excludeId) {
    q._id = { $ne: options.excludeId };
  }
  return Model.findOne(q).select('_id name').lean();
}

module.exports = { findDuplicateByName };
