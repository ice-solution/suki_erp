/** S 單可指派船隻／爬纜器的狀態（香港倉，非「正常」） */
export const ASSIGNABLE_ASSET_STATUS = 'returned_warehouse_hk';

export function isAssignableAsset(record) {
  return record?.status === ASSIGNABLE_ASSET_STATUS;
}

/**
 * 可選列表：香港倉；編輯時保留本單已指派的資產（可能為使用中／待回廠）
 * @param {string|string[]|null|undefined} assignedIds
 */
export function filterAssignableAssets(list, assignedIds) {
  if (!Array.isArray(list)) return [];
  const ids = new Set(
    (Array.isArray(assignedIds) ? assignedIds : assignedIds ? [assignedIds] : [])
      .filter(Boolean)
      .map(String)
  );
  const pool = list.filter((row) => isAssignableAsset(row));
  ids.forEach((id) => {
    const assigned = list.find((row) => String(row._id) === id);
    if (assigned && !pool.some((row) => String(row._id) === id)) {
      pool.push(assigned);
    }
  });
  return pool;
}
