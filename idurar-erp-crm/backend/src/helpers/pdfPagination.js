/**
 * 統一 PDF 項目分頁（Puppeteer + Pug）。
 * 只由 JS 決定換頁；模板僅用 page-break-before 分隔 chunk，唔用 min-height / absolute 貼底。
 */

const PUPPETEER_PRINT_SCALE = 1.3;

function stripLeadingItemIndex(text) {
  return String(text || '')
    .replace(/^\s*\d+[\.\)）、]?\s*/, '')
    .trim();
}

function buildItemContentText(item) {
  const name = stripLeadingItemIndex(item.itemName);
  const desc = item.description ? ' ' + item.description : '';
  return (name + desc).trim() || '-';
}

function estimateTextLines(text, charsPerLine, safetyFactor = 1.08) {
  const raw = String(text || '').trim();
  if (!raw || raw === '-') return 1;
  let lines = 0;
  const parts = raw.split(/\r\n|\n|\r/);
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg.length) {
      lines += 1;
      continue;
    }
    lines += Math.max(1, Math.ceil(seg.length / charsPerLine));
  }
  return Math.max(1, Math.ceil(lines * safetyFactor));
}

function splitTextByLineBudget(text, maxLines, charsPerLine) {
  const raw = String(text || '').trim();
  if (!raw) return [''];
  const chunks = [];
  let current = [];
  let currentLines = 0;

  const flush = () => {
    if (current.length) {
      chunks.push(current.join('\n'));
      current = [];
      currentLines = 0;
    }
  };

  const parts = raw.split(/\r\n|\n|\r/);
  for (let pi = 0; pi < parts.length; pi++) {
    const seg = parts[pi];
    if (!seg.length) {
      if (currentLines + 1 > maxLines && current.length) flush();
      current.push('');
      currentLines += 1;
      continue;
    }
    let offset = 0;
    while (offset < seg.length) {
      const slice = seg.slice(offset, offset + charsPerLine);
      const sliceLines = Math.max(1, Math.ceil(slice.length / charsPerLine));
      if (currentLines + sliceLines > maxLines && current.length) flush();
      current.push(slice);
      currentLines += sliceLines;
      offset += charsPerLine;
    }
  }
  flush();
  return chunks.length ? chunks : [''];
}

function resolvePaginationOptions(options = {}) {
  const pageHeaderLines = options.pageHeaderLines ?? 9;
  const closingBlockLines =
    (options.closingBlockLines ?? 16) + (options.extraClosingLines ?? 0);

  // pageBodyLines / charsPerLine 已按 Puppeteer scale 1.3 實測 tune，唔再除 scale
  return {
    charsPerLine: options.charsPerLine ?? 32,
    pageHeaderLines,
    closingBlockLines,
    pageBodyLines: options.pageBodyLines ?? 38,
    rowSafetyFactor: options.rowSafetyFactor ?? 1.05,
  };
}

function sumRowLines(rows, charsPerLine, rowSafetyFactor) {
  return rows.reduce(
    (sum, row) => sum + estimateTextLines(row.contentText, charsPerLine, rowSafetyFactor),
    0
  );
}

function packRowsIntoPages(rows, midPageCap, lastPageBodyCap, charsPerLine, rowSafetyFactor) {
  if (!rows.length) return [[]];

  const lineOf = (row) => estimateTextLines(row.contentText, charsPerLine, rowSafetyFactor);
  const sumLines = (list) => sumRowLines(list, charsPerLine, rowSafetyFactor);

  const totalLines = sumLines(rows);
  // 全部 items 估計行數仍在一頁正文容量內：整段放同一 chunk（摘要／合計由模板接在同一 item 末頁）
  if (totalLines <= midPageCap) {
    return [rows];
  }
  if (totalLines <= lastPageBodyCap) {
    return [rows];
  }

  // 末頁最多 lastPageBodyCap 行 items；盡量將其餘放前面各頁（填滿 midPageCap）
  let splitAt = 0;
  for (let s = 1; s <= rows.length; s++) {
    const tailLines = sumLines(rows.slice(s));
    if (tailLines > 0 && tailLines <= lastPageBodyCap) {
      splitAt = s;
    }
  }
  if (splitAt === 0) {
    splitAt = rows.length;
  }

  const head = rows.slice(0, splitAt);
  const tail = rows.slice(splitAt);
  const pages = [];

  let i = 0;
  while (i < head.length) {
    const page = [];
    let pageLines = 0;
    while (i < head.length) {
      const rowLines = lineOf(head[i]);
      if (page.length > 0 && pageLines + rowLines > midPageCap) {
        break;
      }
      page.push(head[i]);
      pageLines += rowLines;
      i += 1;
    }
    if (!page.length && i < head.length) {
      page.push(head[i]);
      i += 1;
    }
    pages.push(page);
  }

  if (tail.length) {
    pages.push(tail);
  }

  return pages.length ? pages : [[]];
}

function expandItemsToDisplayRows(items, midPageCap, lastPageBodyCap, charsPerLine) {
  const displayRows = [];

  (items || []).forEach((item, itemIndex) => {
    const fullText = buildItemContentText(item);
    const totalLines = estimateTextLines(fullText, charsPerLine, 1.05);
    // 單一 item 唔超過一頁容量就整項保留，避免不必要拆段
    const splitCap = Math.max(midPageCap, lastPageBodyCap);
    let segments =
      totalLines <= splitCap ? [fullText] : splitTextByLineBudget(fullText, midPageCap, charsPerLine);

    const lastSeg = segments[segments.length - 1];
    // 僅在 item 已因超長而拆段時，才再按末頁容量細分最後一段（避免整項被誤拆成多列）
    if (segments.length > 1 && lastSeg && estimateTextLines(lastSeg, charsPerLine) > lastPageBodyCap) {
      segments = segments.slice(0, -1);
      segments.push(...splitTextByLineBudget(lastSeg, lastPageBodyCap, charsPerLine));
    }

    segments.forEach((contentText, segIdx) => {
      displayRows.push({
        item,
        contentText,
        showMeta: segIdx === 0,
        itemIndex,
      });
    });
  });

  return displayRows;
}

/**
 * @param {object[]} items
 * @param {object} [options]
 * @returns {{ item, contentText, showMeta, itemIndex }[][]}
 */
function buildItemDisplayPageChunks(items, options = {}) {
  const opts = resolvePaginationOptions(options);
  const midPageCap = Math.max(6, opts.pageBodyLines - opts.pageHeaderLines);
  const lastPageBodyCap = Math.max(
    3,
    opts.pageBodyLines - opts.pageHeaderLines - opts.closingBlockLines
  );

  const displayRows = expandItemsToDisplayRows(items, midPageCap, lastPageBodyCap, opts.charsPerLine);
  if (!displayRows.length) {
    return [[]];
  }

  return packRowsIntoPages(
    displayRows,
    midPageCap,
    lastPageBodyCap,
    opts.charsPerLine,
    opts.rowSafetyFactor
  );
}

/**
 * @param {string[]} lines
 * @param {object} [options]
 */
function buildTextLinePageChunks(lines, options = {}) {
  const opts = resolvePaginationOptions(options);
  const closingOnLast = options.reserveClosingOnLastPage ? opts.closingBlockLines : 0;
  const midPageCap = Math.max(6, opts.pageBodyLines - opts.pageHeaderLines);
  const lastPageBodyCap = Math.max(
    3,
    opts.pageBodyLines - opts.pageHeaderLines - closingOnLast
  );

  const rows = (lines || [])
    .filter((t) => t != null && String(t).trim())
    .map((text) => ({ contentText: String(text) }));

  if (!rows.length) {
    return [[]];
  }

  return packRowsIntoPages(
    rows,
    midPageCap,
    lastPageBodyCap,
    opts.charsPerLine,
    opts.rowSafetyFactor
  );
}

function estimateNotesExtraClosingLines(notes, charsPerLine = 32) {
  if (notes == null || !String(notes).trim()) return 0;
  return estimateTextLines(notes, charsPerLine) + 2;
}

const PDF_PAGINATION_PRESETS = {
  wingShunQuote: {
    charsPerLine: 32,
    pageHeaderLines: 9,
    closingBlockLines: 17,
    pageBodyLines: 38,
  },
  wingShunShipRenewal: {
    charsPerLine: 32,
    pageHeaderLines: 10,
    closingBlockLines: 17,
    pageBodyLines: 38,
  },
  supermaxShipRenewal: {
    charsPerLine: 34,
    pageHeaderLines: 12,
    closingBlockLines: 17,
    pageBodyLines: 36,
  },
  supermaxShipRental: {
    charsPerLine: 34,
    pageHeaderLines: 12,
    closingBlockLines: 17,
    pageBodyLines: 36,
  },
  wingShunWse: {
    charsPerLine: 32,
    pageHeaderLines: 12,
    closingBlockLines: 14,
    pageBodyLines: 38,
  },
  shipQuoteRentalExtra: {
    charsPerLine: 40,
    pageHeaderLines: 12,
    closingBlockLines: 0,
    pageBodyLines: 34,
  },
  shipQuoteRentalTerms: {
    charsPerLine: 38,
    pageHeaderLines: 12,
    closingBlockLines: 17,
    pageBodyLines: 38,
  },
};

const TEMPLATE_PRESET_MAP = {
  quote: 'wingShunQuote',
  'shipquote-renewal': 'supermaxShipRenewal',
  wse: 'wingShunWse',
  'shipquote-rental': 'supermaxShipRental',
};

function getPresetOptions(presetKey, overrides = {}) {
  const base = PDF_PAGINATION_PRESETS[presetKey];
  if (!base) {
    throw new Error(`Unknown PDF pagination preset: ${presetKey}`);
  }
  return { ...base, ...overrides };
}

function getPdfPaginationPugLocals(presetKey, items, overrides = {}) {
  const options = getPresetOptions(presetKey, overrides);
  const itemChunks = buildItemDisplayPageChunks(items, options);

  return {
    itemChunks,
    paginationMeta: {
      preset: presetKey,
      pageCount: itemChunks.length,
      singlePageDoc: itemChunks.length === 1,
    },
  };
}

function getPdfPaginationPugLocalsForTemplate(templateName, result, overrides = {}) {
  const key = TEMPLATE_PRESET_MAP[String(templateName || '').toLowerCase()];
  if (!key) return {};
  const notesExtra = estimateNotesExtraClosingLines(result?.notes);
  return getPdfPaginationPugLocals(key, result?.items || [], {
    ...overrides,
    extraClosingLines: (overrides.extraClosingLines ?? 0) + notesExtra,
  });
}

const DEFAULT_RENTAL_EXTRA_ITEMS = [
  { description: '續租-導向吊船 (GSWP-P1)', unitPrice: null },
  { description: '額外電源線(200米以外部份)', unitPrice: null },
  { description: '因井道漏水落雨整壞爬纜器,需更換爬纜器', unitPrice: null },
  { description: '因地盤非法使用嚴重超重,以導致爬纜器損壞需更換爬纜器', unitPrice: null },
  { description: '吊船改吊點重新安排檢驗F2/F3證書', unitPrice: null },
  { description: '三角足場續租(每14日)', unitPrice: null },
  { description: '三角足場裝設及拆卸費用', unitPrice: null },
];

const DEFAULT_RENTAL_TERMS_LINES = [
  '租用價格包括吊船交機及來回運輸費用(不包括離島地區)。',
  '由確定收到租金起計, 90天後送貨。',
  '價格第二及三項為消耗品, 恕不提供租用服務。',
  '租用期間本公司會提供免費自然損耗的維修及使用方法支援(不包括人為損壞)。',
  '預約維修由收到租用者通知24小時內安排修理, 維修工作時間為星期一到六9:00-17:00, 法定假日順延一天。',
  '租用期間如因壞機而影響地盤工作, 本公司可恕不負責。',
  '地盤吊船負荷測試及檢驗證明書(FORM3)需要由租方負責(本公司會提供協助完成)。',
  '在吊船上工作人員須持有吊船工作人員證書或已接受相關訓練。',
  '租用者必須安全正確方法操作, 不應超載負荷或改裝, 否則本公司有權禁止使用。',
  '所有地盤使用人員及第三者保險由租用者負責。',
  '租用者須維持租用吊船原樣及完整, 如有遺失及損壞, 照價賠償。',
];

function plainRentalExtraRow(row) {
  if (!row) return null;
  const plain = typeof row.toObject === 'function' ? row.toObject() : row;
  const unitPrice =
    plain.unitPrice != null && plain.unitPrice !== '' && Number.isFinite(Number(plain.unitPrice))
      ? Number(plain.unitPrice)
      : plain.price != null && plain.price !== '' && Number.isFinite(Number(plain.price))
        ? Number(plain.price)
        : undefined;
  return {
    description: plain.description != null ? String(plain.description) : '',
    unit: plain.unit != null ? String(plain.unit) : '',
    unitPrice,
    sortOrder: plain.sortOrder ?? 0,
  };
}

function buildRentalExtraPageChunks(model) {
  const rentalRowsRaw =
    model?.rentalExtraItems?.length > 0 ? model.rentalExtraItems : DEFAULT_RENTAL_EXTRA_ITEMS;
  const rentalRows = rentalRowsRaw
    .map(plainRentalExtraRow)
    .filter((row) => row && row.description)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const opts = getPresetOptions('shipQuoteRentalExtra');
  const rowsPerPage = Math.max(4, opts.pageBodyLines - opts.pageHeaderLines - 2);
  const chunks = [];
  for (let i = 0; i < rentalRows.length; i += rowsPerPage) {
    chunks.push(
      rentalRows.slice(i, i + rowsPerPage).map((row) => ({
        ...row,
        contentText: row.description,
      }))
    );
  }
  return chunks.length ? chunks : [[]];
}

function buildRentalTermsClosing(model, moment) {
  const defaultPayment = '租賃合約確定須先付全數租金, 其他配件及費用裝設完成付款。';
  const paymentText =
    model?.pdfPaymentMethod != null && String(model.pdfPaymentMethod).trim()
      ? String(model.pdfPaymentMethod).trim()
      : defaultPayment;
  const defaultValidity = model?.expiredDate
    ? `${moment(model.expiredDate).utcOffset(480).format('DD-MM-YYYY')} 或 90天`
    : '90天';
  const validityText =
    model?.pdfQuoteValidity != null && String(model.pdfQuoteValidity).trim()
      ? String(model.pdfQuoteValidity).trim()
      : defaultValidity;
  return { paymentText, validityText };
}

/** 解析租賃說明：每行一條；去掉行首既有編號後再按序編 1、2、3… */
function parseRentalTermLines(model) {
  const custom = model?.rentalDescription && String(model.rentalDescription).trim();
  const rawLines = custom
    ? String(custom).split(/\r\n|\n|\r/).filter((l) => String(l).trim())
    : DEFAULT_RENTAL_TERMS_LINES.slice();

  return rawLines.map((line, index) => ({
    lineNumber: index + 1,
    contentText: stripLeadingItemIndex(String(line).trim()),
  }));
}

function expandRentalTermDisplayRows(termRows, opts) {
  const midPageCap = Math.max(6, opts.pageBodyLines - opts.pageHeaderLines);
  const displayRows = [];

  termRows.forEach((row) => {
    const totalLines = estimateTextLines(row.contentText, opts.charsPerLine, opts.rowSafetyFactor ?? 1.05);
    if (totalLines <= midPageCap) {
      displayRows.push({ ...row, showNumber: true });
      return;
    }
    const segments = splitTextByLineBudget(row.contentText, midPageCap, opts.charsPerLine);
    segments.forEach((seg, segIdx) => {
      displayRows.push({
        lineNumber: row.lineNumber,
        contentText: seg,
        showNumber: segIdx === 0,
      });
    });
  });

  return displayRows;
}

function buildRentalTermsPageChunks(model, moment) {
  const opts = getPresetOptions('shipQuoteRentalTerms');
  const termRows = parseRentalTermLines(model);
  const displayRows = expandRentalTermDisplayRows(termRows, opts);
  const closingOnLast = opts.closingBlockLines;
  const midPageCap = Math.max(6, opts.pageBodyLines - opts.pageHeaderLines);
  const lastPageBodyCap = Math.max(
    3,
    opts.pageBodyLines - opts.pageHeaderLines - closingOnLast
  );

  const termsChunks = packRowsIntoPages(
    displayRows,
    midPageCap,
    lastPageBodyCap,
    opts.charsPerLine,
    opts.rowSafetyFactor ?? 1.05
  );

  return {
    termsChunks,
    rentalTermsClosing: buildRentalTermsClosing(model, moment),
  };
}

function getShipQuoteRentalPdfPugLocals(model, moment) {
  const notesExtra = estimateNotesExtraClosingLines(model?.notes);
  const itemLocals = getPdfPaginationPugLocals('supermaxShipRental', model?.items || [], {
    extraClosingLines: notesExtra,
  });
  const { termsChunks, rentalTermsClosing } = buildRentalTermsPageChunks(model, moment);

  return {
    ...itemLocals,
    extraChunks: buildRentalExtraPageChunks(model),
    termsChunks,
    rentalTermsClosing,
  };
}

// 向後相容舊名稱
const WING_SHUN_QUOTE_PDF_PAGINATION_OPTIONS = PDF_PAGINATION_PRESETS.wingShunQuote;

function buildQuotePdfPageChunks(items, options = {}) {
  return buildItemDisplayPageChunks(items, options);
}

function getWingShunQuotePdfPugLocals(items, overrides = {}) {
  return getPdfPaginationPugLocals('wingShunQuote', items, overrides);
}

module.exports = {
  PUPPETEER_PRINT_SCALE,
  stripLeadingItemIndex,
  buildItemContentText,
  estimateTextLines,
  buildItemDisplayPageChunks,
  buildTextLinePageChunks,
  buildQuotePdfPageChunks,
  PDF_PAGINATION_PRESETS,
  TEMPLATE_PRESET_MAP,
  getPresetOptions,
  getPdfPaginationPugLocals,
  getPdfPaginationPugLocalsForTemplate,
  getShipQuoteRentalPdfPugLocals,
  getWingShunQuotePdfPugLocals,
  WING_SHUN_QUOTE_PDF_PAGINATION_OPTIONS,
};
