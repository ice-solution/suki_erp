const mongoose = require('mongoose');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function resolveQuoteNumberIdentity(body) {
  const prefix = body.numberPrefix != null ? String(body.numberPrefix).trim() : '';
  const num = body.number != null ? String(body.number).trim() : '';
  let invoiceNumber = body.invoiceNumber != null ? String(body.invoiceNumber).trim() : '';

  if (!invoiceNumber && prefix && num) {
    invoiceNumber = `${prefix}-${num}`;
  }

  let resolvedPrefix = prefix;
  let resolvedNumber = num;
  if ((!resolvedPrefix || !resolvedNumber) && invoiceNumber.includes('-')) {
    const parts = invoiceNumber.split('-');
    if (parts.length >= 2) {
      resolvedPrefix = parts[0];
      resolvedNumber = parts.slice(1).join('-');
    }
  }

  return { prefix: resolvedPrefix, number: resolvedNumber, invoiceNumber };
}

function buildMatchClauses(identity, typeFilter) {
  const { prefix, number, invoiceNumber } = identity;
  const or = [];
  if (prefix && number) {
    const clause = { numberPrefix: prefix, number };
    if (typeFilter) clause.type = typeFilter;
    or.push(clause);
  }
  if (invoiceNumber) {
    const clause = {
      invoiceNumber: new RegExp(`^${escapeRegex(invoiceNumber)}$`, 'i'),
    };
    if (typeFilter) clause.type = typeFilter;
    or.push(clause);
  }
  return or;
}

function formatDocLabel(dup) {
  return dup.invoiceNumber && String(dup.invoiceNumber).trim()
    ? String(dup.invoiceNumber).trim()
    : `${dup.numberPrefix}-${dup.number}`;
}

async function findDuplicate(Model, baseFilter, orClauses) {
  if (!orClauses.length) return null;
  return Model.findOne({ ...baseFilter, $or: orClauses })
    .select('_id invoiceNumber numberPrefix number type')
    .lean();
}

/**
 * 報價單（Quote）與吊船報價（ShipQuote）共用 SML 單號：
 * - SML-{n} 在兩邊不可重複（建立／修改皆檢查）
 * - QU 前綴仍只在 Quote 內、同 type 不可重複
 *
 * @param {'quote'|'shipquote'} sourceKind
 * @param {object} body
 * @param {string} [excludeMongoId] 更新時排除自身
 */
async function assertSharedQuoteNumberUnique(sourceKind, body, excludeMongoId) {
  const Quote = mongoose.model('Quote');
  const ShipQuote = mongoose.model('ShipQuote');
  const identity = resolveQuoteNumberIdentity(body);
  const isSml = identity.prefix.toUpperCase() === 'SML';
  const typeTrim = body.type != null ? String(body.type).trim() : '';

  const selfBase = { removed: false };
  if (excludeMongoId) {
    selfBase._id = { $ne: excludeMongoId };
  }

  if (sourceKind === 'quote' && !isSml) {
    if (!typeTrim) {
      return { ok: true };
    }
    const or = buildMatchClauses(identity, typeTrim);
    const dup = await findDuplicate(Quote, selfBase, or);
    if (dup) {
      return {
        ok: false,
        message: `同一報價類型下單號不可重複，已有報價單（${dup.type || '—'}）：${formatDocLabel(dup)}`,
      };
    }
    return { ok: true };
  }

  const orShared = buildMatchClauses(identity, null);
  if (!orShared.length) {
    return { ok: true };
  }

  if (sourceKind === 'quote') {
    const dupQuote = await findDuplicate(Quote, selfBase, orShared);
    if (dupQuote) {
      return {
        ok: false,
        message: `SML 單號不可重複，已有報價單：${formatDocLabel(dupQuote)}`,
      };
    }
    const dupShip = await findDuplicate(ShipQuote, { removed: false }, orShared);
    if (dupShip) {
      return {
        ok: false,
        message: `SML 單號不可重複，已有吊船報價：${formatDocLabel(dupShip)}`,
      };
    }
  } else {
    const dupShip = await findDuplicate(ShipQuote, selfBase, orShared);
    if (dupShip) {
      return {
        ok: false,
        message: `SML 單號不可重複，已有吊船報價：${formatDocLabel(dupShip)}`,
      };
    }
    const dupQuote = await findDuplicate(Quote, { removed: false }, orShared);
    if (dupQuote) {
      return {
        ok: false,
        message: `SML 單號不可重複，已有報價單：${formatDocLabel(dupQuote)}`,
      };
    }
  }

  return { ok: true };
}

module.exports = {
  assertSharedQuoteNumberUnique,
  resolveQuoteNumberIdentity,
};
