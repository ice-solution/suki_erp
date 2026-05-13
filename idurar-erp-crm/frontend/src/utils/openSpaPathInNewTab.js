/**
 * 在獨立新分頁開啟 SPA 路由（DataTable 查看／編輯／新增等）。
 * @param {string} path - 路徑，例如 `/quote/read/abc`；可含 query，例如 `/quote/read/abc?q=foo`
 */
export function openSpaPathInNewTab(path) {
  const raw = path == null ? '' : String(path).trim();
  if (!raw) return;
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  let href;
  try {
    href = new URL(withSlash, window.location.origin).href;
  } catch {
    return;
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}
