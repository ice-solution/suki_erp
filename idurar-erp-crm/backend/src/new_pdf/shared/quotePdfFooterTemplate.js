/**
 * 多類單據 PDF（Puppeteer）頁尾：與 quote、sml、s、shipquote、invoice/smi/wse 等 pug 內嵌頁尾（或舊版 invoice 之 footer）文字一致。
 * 改地址時請同步此檔與上述模板。
 */
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

module.exports = {
  QUOTE_PDF_FOOTER_LINES,
  buildStandardQuoteFooterTemplate,
};
