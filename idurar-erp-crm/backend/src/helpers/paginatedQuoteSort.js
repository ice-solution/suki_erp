/**
 * 報價／吊船列表預設排序：SML 單號數字由小到大。
 * Quote：先 SML 再 QU，同 prefix 依 number 數值升序。
 * ShipQuote（全為 SML）：僅依 number 數值升序。
 */

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 列表／搜尋：依關鍵字組成 $or 條件（含 SML-12345 子字串匹配）。
 * @param {string} searchTerm
 * @param {string[]} fieldsArray
 * @param {object} baseMatch 例如 { removed: false, type: '吊船' }
 */
function buildQuoteNumberSearchMatch(searchTerm, fieldsArray = [], baseMatch = { removed: false }) {
  const q = String(searchTerm || '').trim();
  const fields = { $or: [] };
  if (!q) {
    return { ...baseMatch };
  }

  const escapedSubstring = escapeRegex(q);
  fields.$or.push({
    $expr: {
      $regexMatch: {
        input: { $concat: [{ $ifNull: ['$numberPrefix', ''] }, '-', { $toString: '$number' }] },
        regex: escapedSubstring,
        options: 'i',
      },
    },
  });

  for (const field of fieldsArray) {
    if (field === 'number') {
      const numberValue = parseInt(q, 10);
      if (!Number.isNaN(numberValue)) {
        fields.$or.push({ [field]: numberValue });
        fields.$or.push({ [field]: String(numberValue) });
      }
      fields.$or.push({ [field]: { $regex: new RegExp(escapedSubstring, 'i') } });
    } else if (field !== 'status') {
      fields.$or.push({ [field]: { $regex: new RegExp(escapedSubstring, 'i') } });
    }
  }

  if (q.includes('-')) {
    const [prefixPart, numberPart] = q.split('-');
    const numberValue = parseInt(numberPart, 10);
    if (prefixPart && !Number.isNaN(numberValue)) {
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(escapeRegex(prefixPart), 'i') } },
          { number: String(numberValue) },
        ],
      });
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(escapeRegex(prefixPart), 'i') } },
          { number: numberValue },
        ],
      });
    }
  } else {
    fields.$or.push({ numberPrefix: { $regex: new RegExp(escapedSubstring, 'i') } });
    const numberValue = parseInt(q, 10);
    if (!Number.isNaN(numberValue)) {
      fields.$or.push({ number: numberValue });
      fields.$or.push({ number: String(numberValue) });
    }
    fields.$or.push({ number: { $regex: new RegExp(escapedSubstring, 'i') } });
  }

  return { ...baseMatch, ...fields };
}

const PREFIX_RANK_SWITCH = {
  $switch: {
    branches: [
      { case: { $eq: ['$numberPrefix', 'SML'] }, then: 0 },
      { case: { $eq: ['$numberPrefix', 'QU'] }, then: 1 },
    ],
    default: 2,
  },
};

const NUMBER_NUM_FIELD = {
  $convert: { input: '$number', to: 'int', onError: 0, onNull: 0 },
};

function sortAddFields(includePrefixRank) {
  if (includePrefixRank) {
    return {
      _prefixRank: PREFIX_RANK_SWITCH,
      _numberNum: NUMBER_NUM_FIELD,
    };
  }
  return { _numberNum: NUMBER_NUM_FIELD };
}

function defaultSortObj(includePrefixRank) {
  return includePrefixRank
    ? { _prefixRank: 1, _numberNum: 1 }
    : { _numberNum: 1 };
}

/**
 * @param {import('mongoose').Model} Model
 * @param {object} matchQuery
 * @param {number} skip
 * @param {number} limit
 * @param {{ includePrefixRank?: boolean, populate?: object[] }} options
 */
async function fetchPaginatedByQuoteNumberSort(Model, matchQuery, skip, limit, options = {}) {
  const { includePrefixRank = true, populate = [] } = options;

  const orderedIds = await Model.aggregate([
    { $match: matchQuery },
    { $addFields: sortAddFields(includePrefixRank) },
    { $sort: defaultSortObj(includePrefixRank) },
    { $skip: skip },
    { $limit: limit },
    { $project: { _id: 1 } },
  ]);

  const ids = orderedIds.map((d) => d._id);
  if (ids.length === 0) {
    return [];
  }

  let query = Model.find({ _id: { $in: ids } });
  for (const pop of populate) {
    query = query.populate(pop.path, pop.select);
  }
  const docs = await query.exec();

  const orderMap = new Map(ids.map((id, i) => [id.toString(), i]));
  return [...docs].sort((a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString()));
}

module.exports = {
  PREFIX_RANK_SWITCH,
  NUMBER_NUM_FIELD,
  sortAddFields,
  defaultSortObj,
  buildQuoteNumberSearchMatch,
  fetchPaginatedByQuoteNumberSort,
};
