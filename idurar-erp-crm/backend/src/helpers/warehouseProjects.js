/**
 * 存倉項目可關聯多個 Project（報價編號）；保留 project 作為首項向後相容。
 */
function normalizeProjectIds(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const ids = [];
  for (const item of arr) {
    const id = item && typeof item === 'object' && item._id != null ? item._id : item;
    const s = String(id || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    ids.push(s);
  }
  return ids;
}

function applyWarehouseProjectsFields(target, projectsInput) {
  if (projectsInput === undefined) return target;
  const ids = normalizeProjectIds(projectsInput);
  target.projects = ids;
  target.project = ids.length > 0 ? ids[0] : null;
  return target;
}

const warehouseProjectPopulate = [
  { path: 'project', select: 'name invoiceNumber address' },
  { path: 'projects', select: 'name invoiceNumber address' },
];

module.exports = {
  normalizeProjectIds,
  applyWarehouseProjectsFields,
  warehouseProjectPopulate,
};
