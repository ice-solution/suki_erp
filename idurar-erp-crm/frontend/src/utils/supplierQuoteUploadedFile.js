import { BASE_URL, FILE_BASE_URL } from '@/config/serverApiConfig';

/** S 單上傳檔（DN / Invoice）公開 URL */
export function supplierQuoteUploadedFileHref(file) {
  const name =
    file?.fileName ||
    (file?.path && String(file.path).split('/').pop()) ||
    (file?.url && String(file.url).split('/').pop());
  if (!name) return '#';
  const base = (FILE_BASE_URL && String(FILE_BASE_URL).trim()) || BASE_URL;
  const root = String(base).endsWith('/') ? String(base) : `${String(base)}/`;
  return `${root}uploads/supplierquote/${name}`;
}

export function decodeSupplierQuoteFileName(fileName) {
  if (!fileName) return '';
  try {
    if (String(fileName).includes('%')) {
      return decodeURIComponent(fileName);
    }
    return String(fileName);
  } catch {
    return String(fileName);
  }
}

/** 將 DB 已存檔案轉成 Ant Design Upload fileList 項目（可點擊開啟） */
export function mapSavedSupplierQuoteFilesToUploadList(files = []) {
  return (files || [])
    .filter(Boolean)
    .map((file, index) => {
      const displayName = decodeSupplierQuoteFileName(file.name || file.fileName || `file-${index}`);
      const url = supplierQuoteUploadedFileHref(file);
      return {
        uid: file.id || file._id || `saved-${index}-${displayName}`,
        name: displayName,
        status: 'done',
        url,
        // 標記為已存檔，提交時唔當新上傳
        isExisting: true,
        existingId: file.id || file._id,
        fileName: file.fileName,
        path: file.path,
      };
    });
}
