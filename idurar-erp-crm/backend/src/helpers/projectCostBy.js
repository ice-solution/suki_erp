/** Project.costBy 合法值與舊值對應 */

const COST_BY_VALUES = ['其他公司代工', '超越代工', '材料'];

const COST_BY_LEGACY_MAP = {
  對方: '其他公司代工',
  我方: '超越代工',
};

function normalizeCostBy(value) {
  if (value == null || value === '') return value;
  const raw = String(value).trim();
  if (COST_BY_LEGACY_MAP[raw]) return COST_BY_LEGACY_MAP[raw];
  return raw;
}

module.exports = {
  COST_BY_VALUES,
  COST_BY_LEGACY_MAP,
  normalizeCostBy,
};
