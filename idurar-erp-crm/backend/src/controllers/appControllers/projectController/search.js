const mongoose = require('mongoose');

const Model = mongoose.model('Project');
const QuoteModel = mongoose.model('Quote');
const InvoiceModel = mongoose.model('Invoice');
const ShipQuoteModel = mongoose.model('ShipQuote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 依輸入關鍵字組出 Quote / Invoice / ShipQuote / SupplierQuote 共用查詢：
 * - invoiceNumber、number 模糊
 * - 「PREFIX-NUM」或「PREFIX-NUM/year」拆成 numberPrefix + number 精準
 * - 無連字號但符合 /^[A-Za-z]+\d+$/（如 SMI54）亦拆成 prefix + number
 */
function buildDocumentMatch(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return null;

  const escaped = escapeRegex(trimmed);
  const regex = new RegExp(escaped, 'i');

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

  const ors = [
    { invoiceNumber: { $regex: regex } },
    { number: { $regex: regex } },
  ];

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

  const fields = { $or: [] };
  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(escapeRegex(q), 'i') } });
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
    let fromText = await Model.find(fields.$or.length ? fields : {})
      .where({ removed: false })
      .sort({ invoiceNumber: 1 })
      .limit(10)
      .populate(populatePaths);

    // 2) 一律再查：已同步到專案的各類單據（SML/SMI/PO/S 單等）→ 反查 Project
    const docProjectIds = await collectProjectIdsFromLinkedDocuments(q);
    let fromDocs = [];
    if (docProjectIds.length) {
      fromDocs = await Model.find({ removed: false, _id: { $in: docProjectIds } })
        .sort({ invoiceNumber: 1 })
        .limit(10)
        .populate(populatePaths);
    }

    // 合併：單據命中的專案優先，其次文字欄位命中；去重
    const seen = new Set();
    const merged = [];
    for (const p of [...fromDocs, ...fromText]) {
      const id = p && p._id && String(p._id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(p);
      if (merged.length >= 10) break;
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
