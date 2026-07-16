import dayjs from 'dayjs';

/**
 * 超租天數 = 拆卸日期 − 租賃到期日（大於 0 才顯示超過 N 天）
 * @param {import('dayjs').Dayjs|string|Date|null|undefined} expiredDate 租賃到期日
 * @param {import('dayjs').Dayjs|string|Date|null|undefined} dismantleDate 拆卸日期
 * @returns {string} '0' | '超過N天' | '—'
 */
export function calcRentalOverageLabel(expiredDate, dismantleDate) {
  if (expiredDate == null || dismantleDate == null || expiredDate === '' || dismantleDate === '') {
    return '—';
  }
  const expiry = dayjs(expiredDate).startOf('day');
  const dismantle = dayjs(dismantleDate).startOf('day');
  if (!expiry.isValid() || !dismantle.isValid()) return '—';
  const days = dismantle.diff(expiry, 'day');
  if (days <= 0) return '0';
  return `超過${days}天`;
}
