/** S 單「添加材料」虛擬倉：與成廠房（舊值「供應商管理」仍相容） */
export const XINGCHENG_FACTORY_WAREHOUSE = '與成廠房';
export const LEGACY_SUPPLIER_MANAGED_WAREHOUSE = '供應商管理';

export function isVirtualMaterialWarehouse(warehouse) {
  return (
    warehouse === '其他' ||
    warehouse === XINGCHENG_FACTORY_WAREHOUSE ||
    warehouse === LEGACY_SUPPLIER_MANAGED_WAREHOUSE
  );
}

export function isXingchengFactoryWarehouse(warehouse) {
  return (
    warehouse === XINGCHENG_FACTORY_WAREHOUSE ||
    warehouse === LEGACY_SUPPLIER_MANAGED_WAREHOUSE
  );
}

/** 列表／詳情顯示倉庫名稱（舊值「供應商管理」顯示為「與成廠房」） */
export function formatMaterialWarehouseLabel(warehouse, warehouseOptions = []) {
  if (!warehouse) return '-';
  if (warehouse === LEGACY_SUPPLIER_MANAGED_WAREHOUSE) return XINGCHENG_FACTORY_WAREHOUSE;
  const opt = warehouseOptions.find((o) => o.value === warehouse);
  return opt ? opt.label : warehouse;
}
