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
 * 避免伺服器在 UTC 時區時，漏掉「香港當日 00:00」存成前一日 16:00Z 的紀錄。
 */
function parseHongKongDayRange(dateFrom, dateTo) {
  const parse = (s, endOfDay) => {
    const day = String(s || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const m = moment(day, 'YYYY-MM-DD', true).utcOffset(HK_OFFSET_MINUTES, true);
    if (!m.isValid()) return null;
    return (endOfDay ? m.endOf('day') : m.startOf('day')).toDate();
  };

  const from = parse(dateFrom, false);
  const to = parse(dateTo, true);
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

module.exports = {
  HK_OFFSET_MINUTES,
  hongKongNow,
  hongKongPeriodRange,
  parseHongKongDayRange,
};
