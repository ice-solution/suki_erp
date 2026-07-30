import { request } from '@/request';

/**
 * 即時向後端查詢建議下一號（last + 1），不依賴 Redux 快取。
 * @param {'quote'|'invoice'|'supplier'} kind
 * @param {string} prefix
 * @returns {Promise<string|null>} next number as string
 */
export async function fetchSuggestedNextNumber(kind, prefix) {
  const response = await request.get({
    entity: 'setting/suggested-next-number',
    params: {
      kind,
      prefix: prefix || undefined,
    },
  });
  if (!response?.success || response?.result?.next == null) {
    return null;
  }
  return String(response.result.next);
}
