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

module.exports = {
  HK_OFFSET_MINUTES,
  hongKongNow,
  hongKongPeriodRange,
};
