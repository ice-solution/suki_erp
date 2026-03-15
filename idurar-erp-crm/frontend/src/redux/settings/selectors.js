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
  { value: 'A', name: '倉A', location: '' },
  { value: 'B', name: '倉B', location: '' },
  { value: 'C', name: '倉C', location: '' },
  { value: 'D', name: '倉D', location: '' },
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
        label: w.location ? `倉${w.value} / ${w.location}` : `倉${w.value} / -`,
      }));
    }
    return list.map((w) => ({
      value: w.value,
      label: w.location ? `倉${w.value} / ${w.location}` : `倉${w.value} / -`,
    }));
  }
);
