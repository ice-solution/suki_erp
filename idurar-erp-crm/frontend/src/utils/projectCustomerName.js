/** 顯示用：專案客戶名（商戶選擇或舊版 customerQuoteNumber） */
export function resolveProjectCustomerName(project) {
  const stored =
    project?.customerName != null ? String(project.customerName).trim() : '';
  if (stored) return stored;

  const client = project?.client;
  if (client && typeof client === 'object' && client.name) {
    return String(client.name).trim();
  }

  const legacy =
    project?.customerQuoteNumber != null ? String(project.customerQuoteNumber).trim() : '';
  if (legacy) return legacy;

  return '';
}
