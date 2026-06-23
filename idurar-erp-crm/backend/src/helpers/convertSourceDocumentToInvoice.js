const mongoose = require('mongoose');

const InvoiceModel = mongoose.model('Invoice');
const ProjectModel = mongoose.model('Project');

const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');
const {
  aggregateInvoicedQtyByQuoteLine,
  aggregateInvoicedQtyByShipQuoteLine,
  aggregateInvoicedPercentageByQuoteLine,
  aggregateInvoicedPercentageByShipQuoteLine,
} = require('@/helpers/quoteInvoiceFromQuote');
const { resolvePoConversionLines, resolvePoPercentageLines } = require('@/helpers/resolvePoConversionLines');
const {
  MODE_A,
  MODE_B,
  roundMoney,
  assertConversionModeAllowed,
  assertLinePercentagesWithinRemaining,
  buildInvoiceItemsFromPercentageLines,
  lockSourceInvoiceConversionMode,
} = require('@/helpers/quoteInvoiceConversion');
const { syncInvoiceToProjectsByQuoteNumber } = require('@/helpers/syncInvoiceToProjectsByQuoteNumber');

function buildInvoiceItemsFromResolvedLines(items, resolvedLines) {
  return resolvedLines.map(({ itemIndex, quantity }) => {
    const item = items[itemIndex];
    const price = Number(item.price) || 0;
    const lineTotal = calculate.multiply(quantity, price);
    return {
      itemName: item.itemName,
      description: item.description,
      quantity,
      unit: item.unit,
      price,
      total: roundMoney(lineTotal),
    };
  });
}

function sumItemTotals(invoiceItems) {
  let subTotal = 0;
  invoiceItems.forEach((item) => {
    if (item && item.total != null) {
      subTotal = calculate.add(subTotal, Number(item.total));
    }
  });
  return subTotal;
}

function computeInvoiceTotalsFromItems(selectedItems, discount) {
  const subTotal = sumItemTotals(selectedItems);
  const discountTotal = calculate.multiply(subTotal, discount / 100);
  const total = calculate.sub(subTotal, discountTotal);
  return {
    subTotal: roundMoney(subTotal),
    discountTotal: roundMoney(discountTotal),
    total: roundMoney(total),
  };
}

/**
 * POST 轉發票核心（Quote / ShipQuote 共用）
 * body: { poNumber, conversionMode: 'A'|'B', lines?: [{ itemIndex, quantity|percentage }] }
 */
async function convertSourceDocumentToInvoice({
  sourceDoc,
  sourceQuoteId,
  sourceShipQuoteId,
  convertedFrom,
  req,
}) {
  const items = sourceDoc.items || [];
  const headerPo = String(sourceDoc.poNumber || '').trim();
  const poNumberForInvoice = String(req.body?.poNumber || '').trim();
  if (!poNumberForInvoice) {
    return { ok: false, status: 400, message: 'P.O number is required' };
  }

  const conversionMode = String(req.body?.conversionMode || MODE_A).trim().toUpperCase();
  if (conversionMode !== MODE_A && conversionMode !== MODE_B) {
    return { ok: false, status: 400, message: 'conversionMode 須為 A 或 B' };
  }

  try {
    await assertConversionModeAllowed(sourceQuoteId, sourceShipQuoteId, conversionMode);
  } catch (err) {
    return { ok: false, status: 400, message: err.message };
  }

  let selectedItems;
  let orderFromQuoteLines;

  if (conversionMode === MODE_A) {
    const aggregateFn = sourceQuoteId ? aggregateInvoicedQtyByQuoteLine : aggregateInvoicedQtyByShipQuoteLine;
    const sourceId = sourceQuoteId || sourceShipQuoteId;
    const invoicedMap = await aggregateFn(sourceId, poNumberForInvoice);
    const resolved = resolvePoConversionLines({
      items,
      headerPo,
      poNumber: poNumberForInvoice,
      qtyByLineMap: invoicedMap,
      rawLines: req.body?.lines,
      isPost: true,
    });
    if (!resolved.ok) {
      return { ok: false, status: resolved.status, message: resolved.message };
    }
    orderFromQuoteLines = resolved.lines.map((l) => ({
      itemIndex: l.itemIndex,
      quantity: l.quantity,
    }));
    selectedItems = buildInvoiceItemsFromResolvedLines(items, resolved.lines);
  } else {
    const invoicedPctMap = sourceQuoteId
      ? await aggregateInvoicedPercentageByQuoteLine(sourceQuoteId)
      : await aggregateInvoicedPercentageByShipQuoteLine(sourceShipQuoteId);
    const resolved = resolvePoPercentageLines({
      items,
      headerPo,
      poNumber: poNumberForInvoice,
      pctByLineMap: invoicedPctMap,
      rawLines: req.body?.lines,
      isPost: true,
    });
    if (!resolved.ok) {
      return { ok: false, status: resolved.status, message: resolved.message };
    }
    try {
      await assertLinePercentagesWithinRemaining(
        sourceQuoteId,
        sourceShipQuoteId,
        resolved.lines
      );
    } catch (err) {
      return { ok: false, status: 400, message: err.message };
    }
    orderFromQuoteLines = resolved.lines.map((l) => ({
      itemIndex: l.itemIndex,
      percentage: l.percentage,
    }));
    selectedItems = buildInvoiceItemsFromPercentageLines(items, resolved.lines);
  }

  const quoteNumberLink =
    sourceDoc.numberPrefix && sourceDoc.number
      ? `${sourceDoc.numberPrefix}-${sourceDoc.number}`
      : sourceDoc.invoiceNumber;
  const linkedProject = quoteNumberLink
    ? await ProjectModel.findOne({ invoiceNumber: quoteNumberLink, removed: false })
    : null;
  const linkedProjectId = linkedProject?._id || sourceDoc.project || null;

  const invoiceNumberResult = await increaseBySettingKey({ settingKey: 'last_invoice_number' });
  const invoiceNumber = invoiceNumberResult ? invoiceNumberResult.settingValue : 1;

  const discount = sourceDoc.discount != null ? Number(sourceDoc.discount) : 0;
  const totals = computeInvoiceTotalsFromItems(selectedItems, discount);
  const invoiceTotal = totals.total;

  const invDate = new Date();
  const paymentDueDate = new Date(invDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const convertedPayload = { from: convertedFrom };
  if (sourceQuoteId) convertedPayload.quote = sourceQuoteId;
  if (sourceShipQuoteId) convertedPayload.shipQuote = sourceShipQuoteId;

  const invoiceData = {
    converted: convertedPayload,
    ...(sourceQuoteId ? { sourceQuote: sourceQuoteId } : {}),
    ...(sourceShipQuoteId ? { sourceShipQuote: sourceShipQuoteId } : {}),
    invoiceConversionMode: conversionMode,
    orderFromPoNumber: poNumberForInvoice,
    orderFromQuoteLines,
    numberPrefix: 'SMI',
    number: invoiceNumber.toString(),
    year: new Date().getFullYear(),
    type: sourceDoc.type,
    shipType: sourceDoc.shipType,
    subcontractorCount: sourceDoc.subcontractorCount,
    costPrice: sourceDoc.costPrice,
    date: invDate,
    paymentDueDate,
    paymentTerms: '30日',
    isCompleted: sourceDoc.isCompleted,
    invoiceNumber: quoteNumberLink || sourceDoc.invoiceNumber,
    poNumber: poNumberForInvoice,
    address: sourceDoc.address,
    clients: sourceDoc.clients,
    client: sourceDoc.client,
    project: linkedProjectId,
    items: selectedItems,
    subTotal: totals.subTotal,
    discountTotal: totals.discountTotal,
    total: invoiceTotal,
    credit: 0,
    currency: sourceDoc.currency,
    discount: sourceDoc.discount,
    showDiscountPercentOnPdf: sourceDoc.showDiscountPercentOnPdf,
    showDiscountAmountOnPdf: sourceDoc.showDiscountAmountOnPdf,
    status: 'sent',
    paymentStatus: 'unpaid',
    isOverdue: false,
    approved: false,
    createdBy: req.admin._id,
  };

  const invoice = await new InvoiceModel(invoiceData).save();

  let projectLink = { linkedProjectIds: [] };
  if (quoteNumberLink) {
    projectLink = await syncInvoiceToProjectsByQuoteNumber(invoice._id, quoteNumberLink, {
      preferredProjectId: linkedProjectId,
    });
  }

  await lockSourceInvoiceConversionMode(sourceQuoteId, sourceShipQuoteId, conversionMode);

  const primaryLinkedId =
    projectLink.linkedProjectIds?.[0] || (linkedProjectId ? String(linkedProjectId) : null);

  return { ok: true, invoice, linkedProjectId: primaryLinkedId };
}

module.exports = {
  convertSourceDocumentToInvoice,
};
