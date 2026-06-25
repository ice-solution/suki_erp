/** S 單可指派船隻／爬纜器的狀態（香港倉） */
const ASSIGNABLE_ASSET_STATUS = 'returned_warehouse_hk';

function isAssignableAssetStatus(status) {
  return status === ASSIGNABLE_ASSET_STATUS;
}

/**
 * @param {object|null|undefined} asset lean 文件，含 status
 * @param {string} label 錯誤訊息用名稱
 */
function assertAssetAssignableForSupplierQuote(asset, label = '資產', options = {}) {
  const { supplierQuoteNumber } = options;
  if (!asset) {
    const err = new Error(`${label}不存在`);
    err.statusCode = 400;
    throw err;
  }
  if (isAssignableAssetStatus(asset.status)) return;
  if (
    asset.status === 'in_use' &&
    supplierQuoteNumber &&
    asset.supplierNumber === supplierQuoteNumber
  ) {
    return;
  }
  const err = new Error(`${label}狀態須為「香港倉」方可指派（目前：${asset.status || '未知'}）`);
  err.statusCode = 400;
  throw err;
}

module.exports = {
  ASSIGNABLE_ASSET_STATUS,
  isAssignableAssetStatus,
  assertAssetAssignableForSupplierQuote,
};
