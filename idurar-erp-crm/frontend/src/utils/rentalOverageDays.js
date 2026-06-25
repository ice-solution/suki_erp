import dayjs from 'dayjs';

/** 租賃基準天數：拆卸日 − 安裝日 ≤ 此值則顯示 0 */
export const RENTAL_BASE_DAYS = 60;

/**
 * @param {import('dayjs').Dayjs|string|Date|null|undefined} installDate
 * @param {import('dayjs').Dayjs|string|Date|null|undefined} dismantleDate
 * @returns {string} '0' | '超過N天' | '—'
 */
export function calcRentalOverageLabel(installDate, dismantleDate) {
  if (installDate == null || dismantleDate == null || installDate === '' || dismantleDate === '') {
    return '—';
  }
  const install = dayjs(installDate).startOf('day');
  const dismantle = dayjs(dismantleDate).startOf('day');
  if (!install.isValid() || !dismantle.isValid()) return '—';
  const days = dismantle.diff(install, 'day');
  if (days <= RENTAL_BASE_DAYS) return '0';
  return `超過${days - RENTAL_BASE_DAYS}天`;
}
