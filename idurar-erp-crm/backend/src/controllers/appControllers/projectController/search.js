const mongoose = require('mongoose');

const Model = mongoose.model('Project');
const QuoteModel = mongoose.model('Quote');
const InvoiceModel = mongoose.model('Invoice');
const ShipQuoteModel = mongoose.model('ShipQuote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 「PREFIX-數字」形式（如 S-1、PO-12）：單號欄位可含子字串比對（S-1 亦會命中 S-10 等，與業務預期一致） */
function isLikelyHyphenatedDocumentNumberQuery(q) {
  const t = String(q || '')
    .trim()
    .replace(/\s+/g, '');
  return /^[A-Za-z]{1,10}-\d/.test(t);
}

/**
 * 依輸入關鍵字組出 Quote / Invoice / ShipQuote / SupplierQuote 共用查詢：
 * - 「字母-數字」單號（如 S-1）：invoiceNumber 子字串比對，並搭配 numberPrefix+number 等（與列表搜尋一致）
 * - 其他：invoiceNumber 錨定 ^…(/|$)，並允許「單號/年份」
 * - number：整欄精準匹配
 * - 「PREFIX-NUM/year」拆成 numberPrefix + number；無連字號但符合 SMI54 形式亦拆開
 */
function buildDocumentMatch(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return null;

  const escaped = escapeRegex(trimmed);
  /** 非「字母-數字」單號：invoiceNumber 需錨定（整段或後接 /year） */
  const invoiceNumberRegex = new RegExp(`^${escaped}(/|$)`, 'i');
  /** number 欄為整欄精準匹配 */
  const numberOnlyRegex = new RegExp(`^${escaped}$`, 'i');
  const hyphenDocStyle = isLikelyHyphenatedDocumentNumberQuery(trimmed);

  let parsedPrefix = null;
  let parsedNumber = null;
  const cleaned = trimmed.replace(/\s+/g, '');

  if (cleaned.includes('-')) {
    const [pfx, ...rest] = cleaned.split('-');
    const numRaw = rest.join('-');
    const numOnly = numRaw.split('/')[0];
    if (pfx) parsedPrefix = pfx;
    if (numOnly) parsedNumber = numOnly;
  } else {
    const m = cleaned.match(/^([A-Za-z]{1,10})(\d[\dA-Za-z]*)$/);
    if (m) {
      parsedPrefix = m[1];
      parsedNumber = m[2];
    }
  }

  const ors = [{ number: { $regex: numberOnlyRegex } }];
  if (hyphenDocStyle) {
    ors.unshift({ invoiceNumber: { $regex: new RegExp(escaped, 'i') } });
  } else {
    ors.unshift({ invoiceNumber: { $regex: invoiceNumberRegex } });
  }

  // 純英文字母（僅前綴，如 SMI、SML、S）：多數單據的 number 欄不含前綴，必須比對 numberPrefix
  if (/^[A-Za-z]+$/.test(trimmed)) {
    ors.push({
      numberPrefix: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
    });
  }

  // 「PREFIX-」或「PREFIX-/year」等：有前綴但尚無號碼片段時，仍可依前綴反查
  if (parsedPrefix && !parsedNumber) {
    ors.push({
      numberPrefix: { $regex: new RegExp(`^${escapeRegex(parsedPrefix)}$`, 'i') },
    });
  }

  if (parsedPrefix && parsedNumber) {
    ors.push({
      numberPrefix: { $regex: new RegExp(`^${escapeRegex(parsedPrefix)}$`, 'i') },
      number: { $regex: new RegExp(`^${escapeRegex(parsedNumber)}$`, 'i') },
    });
  }

  return { removed: false, $or: ors };
}

/**
 * 由單據反查 Project：doc.project + Project.quotations / supplierQuotations / invoices / shipQuotations 含該單據 _id
 */
async function collectProjectIdsFromLinkedDocuments(q) {
  const match = buildDocumentMatch(q);
  if (!match) return [];

  const select = '_id project';
  const [quotes, shipQuotes, invoices, supplierQuotes] = await Promise.all([
    QuoteModel.find(match).select(select).limit(50).lean(),
    ShipQuoteModel.find(match).select(select).limit(50).lean(),
    InvoiceModel.find(match).select(select).limit(50).lean(),
    SupplierQuoteModel.find(match).select(select).limit(50).lean(),
  ]);

  const allDocs = [...quotes, ...shipQuotes, ...invoices, ...supplierQuotes];
  const ids = new Set();

  for (const d of allDocs) {
    if (d && d.project) ids.add(String(d.project));
  }

  const reverseOr = [];
  if (quotes.length) reverseOr.push({ quotations: { $in: quotes.map((x) => x._id) } });
  if (shipQuotes.length) reverseOr.push({ shipQuotations: { $in: shipQuotes.map((x) => x._id) } });
  if (invoices.length) reverseOr.push({ invoices: { $in: invoices.map((x) => x._id) } });
  if (supplierQuotes.length) {
    reverseOr.push({ supplierQuotations: { $in: supplierQuotes.map((x) => x._id) } });
  }

  if (reverseOr.length) {
    const fromArrays = await Model.find({ removed: false, $or: reverseOr })
      .select('_id')
      .limit(50)
      .lean();
    fromArrays.forEach((p) => ids.add(String(p._id)));
  }

  return [...ids];
}

const search = async (req, res) => {
  if (req.query.q === undefined || req.query.q === '' || req.query.q === ' ') {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found',
      })
      .end();
  }

  const q = String(req.query.q || '').trim();
  const fieldsArray = (req.query.fields || '').split(',').filter(Boolean);

  /**
   * 僅 Project.invoiceNumber 用錨定／連字號單號規則。
   * poNumber、EO、判頭 invoiceNo 需子字串比對（部分輸入、前後格式不一也能找到）。
   */
  const fields = { $or: [] };
  const escapedQ = escapeRegex(q);
  const hyphenDocNo = isLikelyHyphenatedDocumentNumberQuery(q);

  for (const field of fieldsArray) {
    if (field === 'invoiceNumber') {
      if (hyphenDocNo) {
        fields.$or.push({
          [field]: { $regex: new RegExp(escapedQ, 'i') },
        });
      } else {
        fields.$or.push({
          [field]: { $regex: new RegExp(`^${escapedQ}(/|$)`, 'i') },
        });
      }
    } else {
      fields.$or.push({ [field]: { $regex: new RegExp(escapedQ, 'i') } });
    }
  }

  const populatePaths = [
    { path: 'createdBy', select: 'name' },
    { path: 'suppliers', select: 'name' },
    {
      path: 'quotations',
      select: 'numberPrefix number year total status isCompleted invoiceNumber',
    },
    {
      path: 'supplierQuotations',
      select: 'numberPrefix number year total status invoiceNumber',
    },
    {
      path: 'shipQuotations',
      select: 'numberPrefix number year total status isCompleted invoiceNumber',
    },
    {
      path: 'invoices',
      select: 'invoiceNumber numberPrefix number year total status',
    },
  ];

  try {
    // 1) Project 自身欄位（名稱、地址、專案 quote number、EO 等）
    // fields 為空時不可 find({})，否則會回傳任意前 10 筆專案
    const SEARCH_RESULT_LIMIT = 50;

    let fromText = [];
    if (fields.$or.length) {
      fromText = await Model.find(fields)
        .where({ removed: false })
        .sort({ invoiceNumber: 1 })
        .limit(SEARCH_RESULT_LIMIT)
        .populate(populatePaths);
    }

    // 2) 一律再查：已同步到專案的各類單據（SML/SMI/PO/S 單等）→ 反查 Project
    const docProjectIds = await collectProjectIdsFromLinkedDocuments(q);
    let fromDocs = [];
    if (docProjectIds.length) {
      fromDocs = await Model.find({ removed: false, _id: { $in: docProjectIds } })
        .sort({ invoiceNumber: 1 })
        .limit(SEARCH_RESULT_LIMIT)
        .populate(populatePaths);
    }

    // 合併：單據命中的專案優先，其次文字欄位命中（含 name / address）；去重
    const seen = new Set();
    const merged = [];
    for (const p of [...fromDocs, ...fromText]) {
      const id = p && p._id && String(p._id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(p);
      if (merged.length >= SEARCH_RESULT_LIMIT) break;
    }

    if (merged.length >= 1) {
      return res.status(200).json({
        success: true,
        result: merged,
        message: 'Successfully found all documents',
      });
    }

    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found',
    });
  } catch {
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }
};

module.exports = search;
