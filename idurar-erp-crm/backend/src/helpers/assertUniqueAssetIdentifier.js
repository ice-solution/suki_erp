function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function assertUniqueAssetIdentifier(Model, field, value, { excludeId, label } = {}) {
  const trimmed = String(value || '').trim();
  const fieldLabel = label || field;
  if (!trimmed) {
    return { ok: false, message: `請填寫${fieldLabel}` };
  }
  const query = {
    removed: { $ne: true },
    [field]: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const exists = await Model.findOne(query).select('_id').lean();
  if (exists) {
    return { ok: false, message: `${fieldLabel} 已存在：${trimmed}` };
  }
  return { ok: true, value: trimmed };
}

module.exports = { assertUniqueAssetIdentifier };
