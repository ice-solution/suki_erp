/**
 * 多類單據 PDF（Puppeteer）頁尾：與 quote、sml、s、shipquote、invoice/smi/wse 等 pug 內嵌頁尾（或舊版 invoice 之 footer）文字一致。
 * 改地址時請同步此檔與上述模板。
 */
const fs = require('fs');
const path = require('path');

const QUOTE_PDF_FOOTER_LINES = {
  zh:
    '新界火炭坳背灣街14-24號金豪工業大廈第2期14樓G&H室 電話: 2776 4793, 2756 7579 傳真: 2776 4796',
  en: 'Flat G&H, 14/F, Phase 2, Kin Ho Ind. Bldg., 14-24 Au Pui Wan St., Fotan, N.T. Tel: 2776 4793, 2756 7579 Fax: 2776 4796',
};

/**
 * pug 內嵌頁尾為 font-size:9px；主內容 page.pdf scale:1.3，頁尾模板不在同一縮放流程內，
 * 故用約 9×1.3≈12px，視覺上才與「改 template 前」的內嵌頁尾接近。
 */
function buildStandardQuoteFooterTemplate() {
  const { zh, en } = QUOTE_PDF_FOOTER_LINES;
  return `
<div style="width:100%; box-sizing:border-box; padding:4px 12px 6px; color:#000; border-top:1px solid #ddd; position:relative;">
  <div style="font-size:12px; line-height:1.5; margin-bottom:2px; color:#000; text-align:center;">${zh}</div>
  <div style="font-size:12px; line-height:1.5; margin-bottom:4px; color:#000; text-align:center;">${en}</div>
  <div style="font-size:11px; line-height:1.5; color:#000; position:absolute; right:12px; bottom:6px; text-align:right; white-space:nowrap;">
    第 <span class="pageNumber"></span> 頁 / 共 <span class="totalPages"></span> 頁
  </div>
</div>
`.trim();
}

/**
 * 讀取超越工程頁尾 PNG，供 Puppeteer footerTemplate 使用（不依賴 PUBLIC_SERVER_FILE / 網路）。
 */
function resolveFooter001ImageSrc(publicBaseUrl) {
  const candidates = [
    path.join(__dirname, '../../public/uploads/images/footer_001.png'),
    path.join(process.cwd(), 'src/public/uploads/images/footer_001.png'),
    path.join(process.cwd(), 'backend/src/public/uploads/images/footer_001.png'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch {
      // continue
    }
  }
  const base = String(publicBaseUrl || '').replace(/\/?$/, '/');
  if (base) {
    return `${base}uploads/images/footer_001.png`;
  }
  return '';
}

/**
 * 超越工程：Puppeteer 頁尾改為單一 PNG（footer_001.png），頁碼疊加於右下角。
 * 優先使用本機檔案 base64 內嵌，避免 footerTemplate 內無法載入 http(s) 或相對路徑圖片。
 * @param {string} publicBaseUrl - 後備：PUBLIC_SERVER_FILE（僅當本機找不到 footer_001.png）
 */
function buildSuperMaxImageFooterTemplate(publicBaseUrl) {
  const src = resolveFooter001ImageSrc(publicBaseUrl);
  return `
<div style="width:100%; box-sizing:border-box; padding:2px 8px 4px; position:relative; font-size:0; line-height:0; text-align:center; transform:translateY(-20px);">
  <img src="${src}" alt="" style="width:70%; max-width:70%; margin:0 auto; max-height:22mm; object-fit:contain; object-position:bottom center; display:block;" />
  <div style="font-size:11px; line-height:1.5; color:#333; position:absolute; right:14px; bottom:6px; text-align:right; white-space:nowrap;">
    第 <span class="pageNumber"></span> 頁 / 共 <span class="totalPages"></span> 頁
  </div>
</div>
`.trim();
}

module.exports = {
  QUOTE_PDF_FOOTER_LINES,
  buildStandardQuoteFooterTemplate,
  buildSuperMaxImageFooterTemplate,
};
