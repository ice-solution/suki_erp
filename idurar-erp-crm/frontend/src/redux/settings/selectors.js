import { createSelector } from 'reselect';

export const selectSettings = (state) => state.settings;

export const selectCurrentSettings = createSelector(
  [selectSettings],
  (settings) => settings.result
);

export const selectMoneyFormat = createSelector(
  [selectCurrentSettings],
  (settings) => settings.money_format_settings
);

export const selectAppSettings = createSelector(
  [selectCurrentSettings],
  (settings) => settings.app_settings
);

const DEFAULT_ITEM_UNITS = ['KG', 'SET', 'JOB', '工', 'PCS', 'M', '㎡', 'DAY', '刀'];

export const selectItemUnits = createSelector(
  [selectAppSettings],
  (appSettings) => {
    const units = appSettings?.item_units;
    if (!units || !Array.isArray(units) || units.length === 0) return DEFAULT_ITEM_UNITS;
    // 去重 + 清理空白
    const cleaned = units
      .map((u) => (u == null ? '' : String(u).trim()))
      .filter((u) => u);
    return cleaned.length ? Array.from(new Set(cleaned)) : DEFAULT_ITEM_UNITS;
  }
);

export const selectItemUnitOptions = createSelector([selectItemUnits], (units) =>
  units.map((u) => ({ label: u, value: u }))
);

export const selectFinanceSettings = createSelector(
  [selectCurrentSettings],
  (settings) => settings.finance_settings
);

export const selectCrmSettings = createSelector(
  [selectCurrentSettings],
  (settings) => settings.crm_settings
);

export const selectCompanySettings = createSelector(
  [selectCurrentSettings],
  (settings) => settings?.company_settings ?? {}
);

const DEFAULT_WAREHOUSE_LIST = [
  { value: 'A', name: 'A', location: '' },
  { value: 'B', name: 'B', location: '' },
  { value: 'C', name: 'C', location: '' },
  { value: 'D', name: 'D', location: '' },
];

export const selectWarehouseSettings = createSelector(
  [selectCurrentSettings],
  (settings) => settings?.warehouse_settings ?? {}
);

export const selectWarehouseOptions = createSelector(
  [selectWarehouseSettings],
  (warehouseSettings) => {
    const list = warehouseSettings?.warehouse_list;
    if (!list || !Array.isArray(list) || list.length === 0) {
      return DEFAULT_WAREHOUSE_LIST.map((w) => ({
        value: w.value,
        label: w.location ? `${w.value} / ${w.location}` : `${w.value} / -`,
      }));
    }
    return list.map((w) => ({
      value: w.value,
      label: w.location ? `${w.value} / ${w.location}` : `${w.value} / -`,
    }));
  }
);
