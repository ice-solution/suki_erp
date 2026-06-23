const mongoose = require('mongoose');

const { calculate } = require('@/helpers');

const MODE_A = 'A';
const MODE_B = 'B';

function roundMoney(n) {
  return Number(Number(n).toFixed(2));
}

function buildSourceInvoiceMatch(sourceQuoteId, sourceShipQuoteId) {
  if (sourceQuoteId) {
    const oid = new mongoose.Types.ObjectId(String(sourceQuoteId));
    return {
      $or: [{ sourceQuote: oid }, { 'converted.quote': oid }],
    };
  }
  if (sourceShipQuoteId) {
    const oid = new mongoose.Types.ObjectId(String(sourceShipQuoteId));
    return {
      $or: [{ sourceShipQuote: oid }, { 'converted.shipQuote': oid }],
    };
  }
  return null;
}

/** 報價折扣後總額（優先用已存 total） */
function computeSourceDiscountedTotal(sourceDoc) {
  if (sourceDoc.total != null && !Number.isNaN(Number(sourceDoc.total))) {
    return roundMoney(Number(sourceDoc.total));
  }
  const items = sourceDoc.items || [];
  let subTotal = 0;
  for (const item of items) {
    if (item?.total != null) {
      subTotal = calculate.add(subTotal, Number(item.total));
    } else {
      subTotal = calculate.add(
        subTotal,
        calculate.multiply(Number(item.quantity) || 0, Number(item.price) || 0)
      );
    }
  }
  const discount = sourceDoc.discount != null ? Number(sourceDoc.discount) : 0;
  const discountTotal = calculate.multiply(subTotal, discount / 100);
  return roundMoney(calculate.sub(subTotal, discountTotal));
}

function inferInvoiceConversionMode(invoice) {
  if (invoice?.invoiceConversionMode === MODE_A || invoice?.invoiceConversionMode === MODE_B) {
    return invoice.invoiceConversionMode;
  }
  if (Array.isArray(invoice?.orderFromQuoteLines) && invoice.orderFromQuoteLines.length > 0) {
    return MODE_A;
  }
  if (invoice?.projectPercentage != null && Number(invoice.projectPercentage) > 0 && Number(invoice.projectPercentage) < 100) {
    return MODE_B;
  }
  return null;
}

/** 已鎖定的轉發票方式（首張發票決定；舊資料依 orderFromQuoteLines 視為 A） */
async function detectLockedInvoiceConversionMode(sourceQuoteId, sourceShipQuoteId) {
  const QuoteModel = mongoose.model('Quote');
  const ShipQuoteModel = mongoose.model('ShipQuote');
  const InvoiceModel = mongoose.model('Invoice');

  if (sourceQuoteId) {
    const q = await QuoteModel.findById(sourceQuoteId).select('invoiceConversionMode').lean();
    if (q?.invoiceConversionMode) return q.invoiceConversionMode;
  } else if (sourceShipQuoteId) {
    const q = await ShipQuoteModel.findById(sourceShipQuoteId).select('invoiceConversionMode').lean();
    if (q?.invoiceConversionMode) return q.invoiceConversionMode;
  }

  const sourceMatch = buildSourceInvoiceMatch(sourceQuoteId, sourceShipQuoteId);
  if (!sourceMatch) return null;

  const invoices = await InvoiceModel.find({
    removed: { $ne: true },
    ...sourceMatch,
  })
    .select('invoiceConversionMode orderFromQuoteLines projectPercentage created')
    .sort({ created: 1 })
    .lean();

  for (const inv of invoices) {
    const mode = inferInvoiceConversionMode(inv);
    if (mode) return mode;
  }
  return null;
}

/** B 模式：彙總已轉專案佔比（不含 excludeInvoiceId） */
async function aggregateInvoicedPercentageBySource(sourceQuoteId, sourceShipQuoteId, excludeInvoiceId = null) {
  const InvoiceModel = mongoose.model('Invoice');
  const sourceMatch = buildSourceInvoiceMatch(sourceQuoteId, sourceShipQuoteId);
  if (!sourceMatch) return 0;

  const match = {
    removed: { $ne: true },
    invoiceConversionMode: MODE_B,
    ...sourceMatch,
  };
  if (excludeInvoiceId) {
    match._id = { $ne: new mongoose.Types.ObjectId(String(excludeInvoiceId)) };
  }

  const rows = await InvoiceModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        pct: { $sum: { $ifNull: ['$projectPercentage', 0] } },
      },
    },
  ]);
  const sum = rows[0]?.pct != null ? Number(rows[0].pct) : 0;
  return Math.max(0, Math.min(100, roundMoney(sum)));
}

async function assertConversionModeAllowed(sourceQuoteId, sourceShipQuoteId, requestedMode) {
  const locked = await detectLockedInvoiceConversionMode(sourceQuoteId, sourceShipQuoteId);
  if (locked && locked !== requestedMode) {
    const label = locked === MODE_A ? '按 P.O 行數量（A）' : '專案佔比（B）';
    throw new Error(`此報價已使用「${label}」方式轉發票，不可改用其他方式`);
  }
}

async function assertPercentageWithinRemaining(sourceQuoteId, sourceShipQuoteId, percentage, excludeInvoiceId = null) {
  const pct = Number(percentage);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    throw new Error('專案佔比須為 0 至 100 之間的正數');
  }
  const used = await aggregateInvoicedPercentageBySource(sourceQuoteId, sourceShipQuoteId, excludeInvoiceId);
  const remaining = roundMoney(100 - used);
  if (pct > remaining + 0.0001) {
    throw new Error(`專案佔比 ${pct}% 超過剩餘可轉 ${remaining}%`);
  }
}

function buildFullItemsFromSource(items) {
  return (items || []).map((item) => ({
    itemName: item.itemName,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    total: item.total,
  }));
}

async function lockSourceInvoiceConversionMode(sourceQuoteId, sourceShipQuoteId, mode) {
  const modeFilter = {
    $or: [{ invoiceConversionMode: { $exists: false } }, { invoiceConversionMode: null }],
  };
  if (sourceQuoteId) {
    const QuoteModel = mongoose.model('Quote');
    await QuoteModel.updateOne({ _id: sourceQuoteId, ...modeFilter }, { $set: { invoiceConversionMode: mode } });
  } else if (sourceShipQuoteId) {
    const ShipQuoteModel = mongoose.model('ShipQuote');
    await ShipQuoteModel.updateOne({ _id: sourceShipQuoteId, ...modeFilter }, { $set: { invoiceConversionMode: mode } });
  }
}

/**
 * B 模式發票更新 projectPercentage 時：驗證來源報價剩餘佔比。
 */
async function syncInvoicePercentageModeOnUpdate({ existingInvoice, body }) {
  const mode = inferInvoiceConversionMode(existingInvoice);
  if (mode !== MODE_B) return body;

  const sourceQuoteId = existingInvoice.sourceQuote;
  const sourceShipQuoteId = existingInvoice.sourceShipQuote;
  if (!sourceQuoteId && !sourceShipQuoteId) return body;

  const rawPct =
    body.projectPercentage !== undefined ? body.projectPercentage : existingInvoice.projectPercentage;
  const newPct =
    rawPct != null && rawPct !== '' ? Math.min(100, Math.max(0, Number(rawPct))) : 100;

  await assertPercentageWithinRemaining(
    sourceQuoteId,
    sourceShipQuoteId,
    newPct,
    existingInvoice._id
  );

  if (body.projectPercentage !== undefined) {
    body.projectPercentage = newPct;
  }
  return body;
}

module.exports = {
  MODE_A,
  MODE_B,
  roundMoney,
  computeSourceDiscountedTotal,
  inferInvoiceConversionMode,
  detectLockedInvoiceConversionMode,
  aggregateInvoicedPercentageBySource,
  assertConversionModeAllowed,
  assertPercentageWithinRemaining,
  buildFullItemsFromSource,
  lockSourceInvoiceConversionMode,
  syncInvoicePercentageModeOnUpdate,
};
