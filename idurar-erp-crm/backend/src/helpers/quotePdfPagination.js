/**
 * 永順報價／WSE 發票 PDF：長工程內容分段分頁，末頁預留合計＋簽署區。
 */

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

function sumRowLines(rows, charsPerLine) {
  return rows.reduce(
    (sum, row) => sum + estimateTextLines(row.contentText, charsPerLine, 1.05),
    0
  );
}

function packDisplayRowsIntoPages(displayRows, midPageCap, lastPageBodyCap, charsPerLine) {
  const pages = [];
  let i = 0;

  while (i < displayRows.length) {
    const tailRows = displayRows.slice(i);
    const tailLines = sumRowLines(tailRows, charsPerLine);

    if (tailLines <= lastPageBodyCap) {
      pages.push(tailRows);
      break;
    }

    const currentPage = [];
    let currentLines = 0;

    while (i < displayRows.length) {
      const row = displayRows[i];
      const rowLines = estimateTextLines(row.contentText, charsPerLine, 1.05);
      const afterTailLines = sumRowLines(displayRows.slice(i + 1), charsPerLine);

      if (afterTailLines <= lastPageBodyCap) {
        break;
      }

      if (currentPage.length > 0 && currentLines + rowLines > midPageCap) {
        break;
      }

      currentPage.push(row);
      currentLines += rowLines;
      i += 1;
    }

    if (currentPage.length) {
      pages.push(currentPage);
    } else if (i < displayRows.length) {
      pages.push([displayRows[i]]);
      i += 1;
    }
  }

  return pages.length ? pages : [[]];
}

function expandItemsToDisplayRows(items, midPageCap, lastPageBodyCap, charsPerLine) {
  const displayRows = [];

  (items || []).forEach((item, itemIndex) => {
    const fullText = buildItemContentText(item);
    let segments = splitTextByLineBudget(fullText, midPageCap, charsPerLine);

    const lastSeg = segments[segments.length - 1];
    if (lastSeg && estimateTextLines(lastSeg, charsPerLine) > lastPageBodyCap) {
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
function buildQuotePdfPageChunks(items, options = {}) {
  const charsPerLine = options.charsPerLine ?? 22;
  const pageHeaderLines = options.pageHeaderLines ?? 11;
  const closingBlockLines = options.closingBlockLines ?? 14;
  const pageBodyLines = options.pageBodyLines ?? 28;
  const midPageCap = Math.max(8, pageBodyLines - pageHeaderLines);
  const lastPageBodyCap = Math.max(4, pageBodyLines - pageHeaderLines - closingBlockLines);

  const displayRows = expandItemsToDisplayRows(items, midPageCap, lastPageBodyCap, charsPerLine);
  if (!displayRows.length) {
    return [[]];
  }

  return packDisplayRowsIntoPages(displayRows, midPageCap, lastPageBodyCap, charsPerLine);
}

const WING_SHUN_QUOTE_PDF_PAGINATION_OPTIONS = {
  // 配合 quote.pug 欄寬（col-content 44%）及 Puppeteer A4 scale 1.3 實際排版
  charsPerLine: 32,
  pageHeaderLines: 9,
  closingBlockLines: 10,
  pageBodyLines: 38,
};

/** @param {object[]} items @returns {{ itemChunks: object[][] }} */
function getWingShunQuotePdfPugLocals(items) {
  return {
    itemChunks: buildQuotePdfPageChunks(items, WING_SHUN_QUOTE_PDF_PAGINATION_OPTIONS),
  };
}

module.exports = {
  stripLeadingItemIndex,
  buildItemContentText,
  estimateTextLines,
  buildQuotePdfPageChunks,
  WING_SHUN_QUOTE_PDF_PAGINATION_OPTIONS,
  getWingShunQuotePdfPugLocals,
};
