/**
 * PDF 用壓縮版信頭／頁尾圖（原圖 header_001.png 約 6MB、footer_001.png 約 1MB，
 * 每頁嵌入會令數頁文件達數 MB～十數 MB，無法電郵）。
 */
const fs = require('fs');
const path = require('path');

const IMAGE_DIRS = [
  path.join(__dirname, '../../public/uploads/images'),
  path.join(process.cwd(), 'src/public/uploads/images'),
  path.join(process.cwd(), 'backend/src/public/uploads/images'),
];

const cache = {};

function resolveExisting(fileNames) {
  for (const fileName of fileNames) {
    for (const dir of IMAGE_DIRS) {
      const filePath = path.join(dir, fileName);
      if (fs.existsSync(filePath)) return filePath;
    }
  }
  return null;
}

function fileToDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function getCachedDataUri(cacheKey, fileNames) {
  if (cache[cacheKey]) return cache[cacheKey];
  const filePath = resolveExisting(fileNames);
  cache[cacheKey] = filePath ? fileToDataUri(filePath) : '';
  return cache[cacheKey];
}

function getPdfHeaderSrc() {
  return getCachedDataUri('header', ['header_001_pdf.jpg', 'header_001.png']);
}

function getPdfFooterSrc() {
  return getCachedDataUri('footer', ['footer_001_pdf.jpg', 'footer_001.png']);
}

/** 把壓縮圖 data URI 掛上 settings，pug／footerTemplate 優先使用 */
function attachPdfBrandImages(settings = {}) {
  const header = getPdfHeaderSrc();
  const footer = getPdfFooterSrc();
  if (header) settings.pdfHeaderSrc = header;
  if (footer) settings.pdfFooterSrc = footer;
  return settings;
}

module.exports = {
  getPdfHeaderSrc,
  getPdfFooterSrc,
  attachPdfBrandImages,
};
