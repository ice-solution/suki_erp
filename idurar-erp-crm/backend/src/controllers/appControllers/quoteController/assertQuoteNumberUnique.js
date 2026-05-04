const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 報價單（Quote）唯一性：同一「報價類型 type + numberPrefix + number」不可重複；
 * 若以 invoiceNumber 比對，亦須相同 type 才算衝突（關聯單號可與其他類型並存）。
 * @param {import('mongoose').Model} QuoteModel
 * @param {{ numberPrefix?: string, number?: string | number, invoiceNumber?: string, type?: string }} body
 * @param {string} [excludeMongoId] 更新時排除自身 _id
 */
async function assertQuoteNumberUnique(QuoteModel, body, excludeMongoId) {
  const prefix = body.numberPrefix != null ? String(body.numberPrefix).trim() : '';
  const num = body.number != null ? String(body.number).trim() : '';
  const invoiceTrim = body.invoiceNumber != null ? String(body.invoiceNumber).trim() : '';
  const typeTrim = body.type != null ? String(body.type).trim() : '';

  const base = { removed: false };
  if (excludeMongoId) {
    base._id = { $ne: excludeMongoId };
  }

  const or = [];
  if (prefix && num) {
    const q = { numberPrefix: prefix, number: num };
    if (typeTrim) q.type = typeTrim;
    or.push(q);
  }
  if (invoiceTrim) {
    const q = {
      invoiceNumber: new RegExp(`^${escapeRegex(invoiceTrim)}$`, 'i'),
    };
    if (typeTrim) q.type = typeTrim;
    or.push(q);
  }

  if (or.length === 0) {
    return { ok: true };
  }

  const dup = await QuoteModel.findOne({ ...base, $or: or })
    .select('_id invoiceNumber numberPrefix number type')
    .lean();

  if (!dup) {
    return { ok: true };
  }

  const label =
    dup.invoiceNumber && String(dup.invoiceNumber).trim()
      ? String(dup.invoiceNumber).trim()
      : `${dup.numberPrefix}-${dup.number}`;
  return {
    ok: false,
    message: `同一報價類型下單號不可重複，已有報價單（${dup.type || '—'}）：${label}`,
  };
}

module.exports = assertQuoteNumberUnique;
