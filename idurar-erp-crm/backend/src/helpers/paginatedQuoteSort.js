/**
 * 報價／吊船列表預設排序：
 * - Quote：SML → QU → 其他 prefix；同 prefix 依 number 前段數字升序，再依後綴字母升序
 * - ShipQuote（全為 SML）：依 number 數字升序，再依後綴字母升序
 */

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 與 aggregation 邏輯一致，供 neighbors 等處解析當前單號 */
function parseQuoteNumberForSort(number) {
  const raw = String(number ?? '').trim();
  const m = raw.match(/^([0-9]+)(.*)$/);
  if (!m) {
    return { num: 0, suffix: raw.toLowerCase(), raw: raw.toLowerCase() };
  }
  return {
    num: parseInt(m[1], 10) || 0,
    suffix: (m[2] || '').toLowerCase(),
    raw: raw.toLowerCase(),
  };
}

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
  $let: {
    vars: {
      s: { $toString: { $ifNull: ['$number', ''] } },
      lead: {
        $regexFind: {
          input: { $toString: { $ifNull: ['$number', ''] } },
          regex: '^[0-9]+',
        },
      },
    },
    in: {
      $convert: {
        input: { $ifNull: ['$$lead.match', '0'] },
        to: 'int',
        onError: 0,
        onNull: 0,
      },
    },
  },
};

const NUMBER_SUFFIX_FIELD = {
  $let: {
    vars: {
      s: { $toString: { $ifNull: ['$number', ''] } },
      lead: {
        $regexFind: {
          input: { $toString: { $ifNull: ['$number', ''] } },
          regex: '^[0-9]+',
        },
      },
    },
    in: {
      $toLower: {
        $cond: [
          { $ifNull: ['$$lead.match', false] },
          { $substrCP: ['$$s', { $strLenCP: '$$lead.match' }, 999] },
          '$$s',
        ],
      },
    },
  },
};

const NUMBER_RAW_FIELD = {
  $toLower: { $toString: { $ifNull: ['$number', ''] } },
};

function sortAddFields(includePrefixRank) {
  const numberFields = {
    _numberNum: NUMBER_NUM_FIELD,
    _numberSuffix: NUMBER_SUFFIX_FIELD,
    _numberRaw: NUMBER_RAW_FIELD,
  };
  if (includePrefixRank) {
    return {
      _prefixRank: PREFIX_RANK_SWITCH,
      ...numberFields,
    };
  }
  return numberFields;
}

function defaultSortObj(includePrefixRank) {
  const numberSort = { _numberNum: 1, _numberSuffix: 1, _numberRaw: 1 };
  return includePrefixRank ? { _prefixRank: 1, ...numberSort } : numberSort;
}

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
  NUMBER_SUFFIX_FIELD,
  NUMBER_RAW_FIELD,
  parseQuoteNumberForSort,
  sortAddFields,
  defaultSortObj,
  buildQuoteNumberSearchMatch,
  fetchPaginatedByQuoteNumberSort,
};
