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
  // 完整單號：PREFIX-number（含字母後綴，如 SMI-2508114R）
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
      if (!Number.isNaN(numberValue) && String(numberValue) === q) {
        fields.$or.push({ [field]: numberValue });
        fields.$or.push({ [field]: String(numberValue) });
      }
      fields.$or.push({ [field]: { $regex: new RegExp(escapedSubstring, 'i') } });
    } else if (field !== 'status') {
      fields.$or.push({ [field]: { $regex: new RegExp(escapedSubstring, 'i') } });
    }
  }

  if (q.includes('-')) {
    // 只拆第一個 '-'，保留 number 後綴字母（2508114R）
    const dashIdx = q.indexOf('-');
    const prefixPart = q.slice(0, dashIdx).trim();
    const numberPart = q.slice(dashIdx + 1).trim();
    if (prefixPart && numberPart) {
      const escapedPrefix = escapeRegex(prefixPart);
      const escapedNumberPart = escapeRegex(numberPart);
      // 精確／前綴匹配完整 number 字串（含 R、A 等後綴）
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(`^${escapedPrefix}$`, 'i') } },
          { number: { $regex: new RegExp(`^${escapedNumberPart}`, 'i') } },
        ],
      });
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(`^${escapedPrefix}$`, 'i') } },
          { number: numberPart },
        ],
      });
      // 純數字後備（舊資料 number 無後綴）
      const numberValue = parseInt(numberPart, 10);
      if (!Number.isNaN(numberValue)) {
        fields.$or.push({
          $and: [
            { numberPrefix: { $regex: new RegExp(`^${escapedPrefix}$`, 'i') } },
            { number: String(numberValue) },
          ],
        });
        fields.$or.push({
          $and: [
            { numberPrefix: { $regex: new RegExp(`^${escapedPrefix}$`, 'i') } },
            { number: numberValue },
          ],
        });
      }
    }
  } else {
    fields.$or.push({ numberPrefix: { $regex: new RegExp(escapedSubstring, 'i') } });
    const numberValue = parseInt(q, 10);
    if (!Number.isNaN(numberValue) && String(numberValue) === q) {
      fields.$or.push({ number: numberValue });
      fields.$or.push({ number: String(numberValue) });
    }
    fields.$or.push({ number: { $regex: new RegExp(escapedSubstring, 'i') } });
  }

  return { ...baseMatch, ...fields };
}

/**
 * 已選定 numberPrefix 時：喺該前綴內搜尋（支援 1–2 位短單號），唔再靠完整 PREFIX-number。
 */
function buildWithinPrefixSearchMatch(
  searchTerm,
  prefix,
  fieldsArray = [],
  baseMatch = { removed: false }
) {
  const q = String(searchTerm || '').trim();
  const p = String(prefix || '').trim();
  const match = { ...baseMatch };
  if (p) {
    match.numberPrefix = p;
  }
  if (!q) {
    return match;
  }

  let numberQuery = q;
  if (q.includes('-')) {
    const dashIdx = q.indexOf('-');
    const maybePrefix = q.slice(0, dashIdx).trim();
    const numberPart = q.slice(dashIdx + 1).trim();
    // 若輸入 IH-1 而 filter 已係 IH，只取後面嘅單號部分
    if (numberPart && (!p || maybePrefix.toUpperCase() === p.toUpperCase())) {
      numberQuery = numberPart;
    }
  }

  const escaped = escapeRegex(numberQuery);
  // 單號：以前綴開頭匹配（IH +「1」→ IH-1、IH-10…），短位數亦可
  const or = [{ number: { $regex: new RegExp(`^${escaped}`, 'i') } }];

  // 純數字時同時匹配數字／字串型 number（兼容舊 Number schema）
  if (/^[0-9]+[A-Za-z]*$/.test(numberQuery)) {
    const numOnly = parseInt(numberQuery, 10);
    if (!Number.isNaN(numOnly)) {
      or.push({ number: String(numOnly) });
      or.push({ number: numOnly });
      or.push({ number: { $regex: new RegExp(`^${escapeRegex(String(numOnly))}`, 'i') } });
    }
  }

  for (const field of fieldsArray) {
    if (!field || field === 'number' || field === 'numberPrefix' || field === 'status') continue;
    or.push({ [field]: { $regex: new RegExp(escapeRegex(q), 'i') } });
  }

  match.$or = or;
  return match;
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

/** S單列表：S → NO → SWP → Y，其餘 prefix 排後 */
const SUPPLIER_QUOTE_PREFIX_RANK_SWITCH = {
  $switch: {
    branches: [
      { case: { $eq: ['$numberPrefix', 'S'] }, then: 0 },
      { case: { $eq: ['$numberPrefix', 'IP'] }, then: 0 },
      { case: { $eq: ['$numberPrefix', 'IH'] }, then: 0 },
      { case: { $eq: ['$numberPrefix', 'NO'] }, then: 1 },
      { case: { $eq: ['$numberPrefix', 'SWP'] }, then: 2 },
      { case: { $eq: ['$numberPrefix', 'Y'] }, then: 3 },
    ],
    default: 4,
  },
};

/** 發票列表：SMI → WSE → SP，其餘 prefix 排後 */
const INVOICE_PREFIX_RANK_SWITCH = {
  $switch: {
    branches: [
      { case: { $eq: ['$numberPrefix', 'SMI'] }, then: 0 },
      { case: { $eq: ['$numberPrefix', 'WSE'] }, then: 1 },
      { case: { $eq: ['$numberPrefix', 'SP'] }, then: 2 },
    ],
    default: 3,
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

function sortAddFields(options = {}) {
  const includePrefixRank =
    typeof options === 'boolean' ? options : options.includePrefixRank !== false;
  const prefixRankSwitch =
    typeof options === 'object' && options.prefixRankSwitch
      ? options.prefixRankSwitch
      : PREFIX_RANK_SWITCH;

  const numberFields = {
    _numberNum: NUMBER_NUM_FIELD,
    _numberSuffix: NUMBER_SUFFIX_FIELD,
    _numberRaw: NUMBER_RAW_FIELD,
  };
  if (includePrefixRank) {
    return {
      _prefixRank: prefixRankSwitch,
      ...numberFields,
    };
  }
  return numberFields;
}

function defaultSortObj(includePrefixRank, numberSortDir = 1) {
  const dir = numberSortDir === -1 ? -1 : 1;
  const numberSort = { _numberNum: dir, _numberSuffix: dir, _numberRaw: dir };
  return includePrefixRank ? { _prefixRank: 1, ...numberSort } : numberSort;
}

async function fetchPaginatedByQuoteNumberSort(Model, matchQuery, skip, limit, options = {}) {
  const {
    includePrefixRank = true,
    prefixRankSwitch = PREFIX_RANK_SWITCH,
    populate = [],
    numberSortDir = 1,
  } = options;

  const orderedIds = await Model.aggregate([
    { $match: matchQuery },
    { $addFields: sortAddFields({ includePrefixRank, prefixRankSwitch }) },
    { $sort: defaultSortObj(includePrefixRank, numberSortDir) },
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

async function fetchPaginatedBySupplierQuoteNumberSort(Model, matchQuery, skip, limit, options = {}) {
  return fetchPaginatedByQuoteNumberSort(Model, matchQuery, skip, limit, {
    ...options,
    includePrefixRank: true,
    prefixRankSwitch: SUPPLIER_QUOTE_PREFIX_RANK_SWITCH,
  });
}

/** 發票：SMI → WSE → SP；同前綴內 yymmxxx（number）由大到小 */
async function fetchPaginatedByInvoiceNumberSort(Model, matchQuery, skip, limit, options = {}) {
  return fetchPaginatedByQuoteNumberSort(Model, matchQuery, skip, limit, {
    ...options,
    includePrefixRank: true,
    prefixRankSwitch: INVOICE_PREFIX_RANK_SWITCH,
    numberSortDir: -1,
  });
}

module.exports = {
  PREFIX_RANK_SWITCH,
  SUPPLIER_QUOTE_PREFIX_RANK_SWITCH,
  INVOICE_PREFIX_RANK_SWITCH,
  NUMBER_NUM_FIELD,
  NUMBER_SUFFIX_FIELD,
  NUMBER_RAW_FIELD,
  parseQuoteNumberForSort,
  sortAddFields,
  defaultSortObj,
  buildQuoteNumberSearchMatch,
  buildWithinPrefixSearchMatch,
  fetchPaginatedByQuoteNumberSort,
  fetchPaginatedBySupplierQuoteNumberSort,
  fetchPaginatedByInvoiceNumberSort,
};
