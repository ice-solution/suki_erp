/** S 單可指派船隻／爬纜器的狀態（香港倉，非「正常」） */
export const ASSIGNABLE_ASSET_STATUS = 'returned_warehouse_hk';

export function isAssignableAsset(record) {
  return record?.status === ASSIGNABLE_ASSET_STATUS;
}

/**
 * 可選列表：香港倉；編輯時保留本單已指派的資產（可能為使用中）
 */
export function filterAssignableAssets(list, assignedId) {
  if (!Array.isArray(list)) return [];
  const pool = list.filter((row) => isAssignableAsset(row));
  if (!assignedId) return pool;
  const assigned = list.find((row) => String(row._id) === String(assignedId));
  if (assigned && !pool.some((row) => String(row._id) === String(assignedId))) {
    return [...pool, assigned];
  }
  return pool;
}
