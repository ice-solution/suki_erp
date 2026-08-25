const moment = require('moment');

const HK_OFFSET_MINUTES = 480;

/** 香港時間的 moment 實例 */
function hongKongNow() {
  return moment().utcOffset(HK_OFFSET_MINUTES);
}

/** 依 week / month / year 回傳香港時間的區間起迄 */
function hongKongPeriodRange(type = 'month') {
  const now = hongKongNow();
  return {
    startDate: now.clone().startOf(type),
    endDate: now.clone().endOf(type),
  };
}

/**
 * 將 YYYY-MM-DD 解讀為香港日曆日，回傳 UTC Date 起迄（含當日頭尾）。
 * 不用伺服器本機 TZ，避免 UTC 主機漏掉「香港當日 00:00」（存成前一日 16:00Z）的紀錄。
 */
function parseHongKongDayRange(dateFrom, dateTo) {
  const parse = (s, endOfDay) => {
    const parts = String(s || '')
      .slice(0, 10)
      .split('-')
      .map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
    const [y, m, d] = parts;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    // 香港 = UTC+8：當日 00:00 HKT = UTC 前日 16:00；當日 23:59:59.999 HKT = UTC 當日 15:59:59.999
    if (endOfDay) {
      return new Date(Date.UTC(y, m - 1, d, 15, 59, 59, 999));
    }
    return new Date(Date.UTC(y, m - 1, d, -8, 0, 0, 0));
  };

  const from = parse(dateFrom, false);
  const to = parse(dateTo, true);
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

/** 將任意日期值轉成香港日曆日 YYYY-MM-DD（用於打咭日期比對，避免時區導致重複漏檢） */
function toHongKongDateKey(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const m = moment(value).utcOffset(HK_OFFSET_MINUTES);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const m = moment(value).utcOffset(HK_OFFSET_MINUTES);
  return m.isValid() ? m.format('YYYY-MM-DD') : '';
}

module.exports = {
  HK_OFFSET_MINUTES,
  hongKongNow,
  hongKongPeriodRange,
  parseHongKongDayRange,
  toHongKongDateKey,
};
