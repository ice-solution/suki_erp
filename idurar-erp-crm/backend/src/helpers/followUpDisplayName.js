const mongoose = require('mongoose');

let cachedList = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

async function loadFollowUpPersonList() {
  const now = Date.now();
  if (cachedList && now - cachedAt < CACHE_MS) return cachedList;
  try {
    const Setting = mongoose.model('Setting');
    const row = await Setting.findOne({
      settingKey: 'follow_up_person_list',
      removed: { $ne: true },
    })
      .select('settingValue')
      .lean();
    cachedList = Array.isArray(row?.settingValue) ? row.settingValue : [];
    cachedAt = now;
  } catch (e) {
    cachedList = [];
    cachedAt = now;
  }
  return cachedList;
}

function customNameForAdminId(list, adminId) {
  if (!adminId || !Array.isArray(list)) return '';
  const hit = list.find((p) => String(p.adminId) === String(adminId));
  return hit?.displayName != null ? String(hit.displayName).trim() : '';
}

/**
 * PDF 顯示跟單人時套用設定中的自訂名稱（覆寫 followUpBy.name）。
 */
async function applyFollowUpCustomNameToModel(model) {
  if (!model || !model.followUpBy) return model;
  const list = await loadFollowUpPersonList();
  const fu = model.followUpBy;
  const id = fu && typeof fu === 'object' ? fu._id || fu.id : fu;
  const custom = customNameForAdminId(list, id);
  if (!custom) return model;

  if (fu && typeof fu === 'object') {
    const plain = typeof fu.toObject === 'function' ? fu.toObject() : { ...fu };
    plain.name = custom;
    plain.surname = '';
    model.followUpBy = plain;
  }
  return model;
}

module.exports = {
  loadFollowUpPersonList,
  customNameForAdminId,
  applyFollowUpCustomNameToModel,
};
