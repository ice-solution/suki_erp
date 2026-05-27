/** 顯示用：專案儲存的客戶 Quote Number，或從已接受報價單推斷 */
export function resolveCustomerQuoteNumber(project) {
  const stored =
    project?.customerQuoteNumber != null ? String(project.customerQuoteNumber).trim() : '';
  if (stored) return stored;

  const linkNo =
    project?.invoiceNumber != null ? String(project.invoiceNumber).trim() : '';

  const acceptedQuote = (project?.quotations || []).find((q) => q?.status === 'accepted');
  if (acceptedQuote?.invoiceNumber) {
    const inv = String(acceptedQuote.invoiceNumber).trim();
    if (inv) return inv;
  }

  const completedShip = (project?.shipQuotations || []).find((q) => q?.isCompleted === true);
  if (completedShip?.invoiceNumber) {
    const inv = String(completedShip.invoiceNumber).trim();
    if (inv && inv !== linkNo) return inv;
    if (inv && !linkNo) return inv;
  }

  return '';
}

export function pickCustomerQuoteNumberFromDoc(doc, linkQuoteNum) {
  if (!doc?.invoiceNumber) return '';
  const inv = String(doc.invoiceNumber).trim();
  if (!inv) return '';
  const link = linkQuoteNum != null ? String(linkQuoteNum).trim() : '';
  return inv;
}
