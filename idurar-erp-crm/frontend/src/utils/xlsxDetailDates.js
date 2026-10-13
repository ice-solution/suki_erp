import * as XLSX from 'xlsx';

/**
 * 詳細日期欄：儲存格已用 \n 分行時，提高列高／欄寬。
 * 並標記 cell 讓後續 write 保留換行字元。
 */
export function patchDetailDatesColumn(ws, headerName = '詳細日期') {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  let detailCol = -1;
  for (let C = range.s.c; C <= range.e.c; C += 1) {
    const header = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (header && String(header.v) === headerName) {
      detailCol = C;
      break;
    }
  }
  if (detailCol < 0) return;

  const rowsMeta = ws['!rows'] || [];
  for (let R = range.s.r + 1; R <= range.e.r; R += 1) {
    const addr = XLSX.utils.encode_cell({ r: R, c: detailCol });
    const cell = ws[addr];
    if (!cell || cell.v == null) continue;
    const text = String(cell.v);
    cell.t = 's';
    cell.v = text;
    cell.w = text;
    const lineCount = Math.max(1, text.split('\n').length);
    rowsMeta[R] = { hpt: Math.max(18, lineCount * 15) };
  }
  ws['!rows'] = rowsMeta;

  const cols = ws['!cols'] || [];
  cols[detailCol] = { ...(cols[detailCol] || {}), wch: 14 };
  ws['!cols'] = cols;
}
