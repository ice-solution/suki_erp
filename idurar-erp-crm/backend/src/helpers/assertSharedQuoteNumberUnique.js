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

/** QU：同 type 下檢查單號／Quote Number */
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

/**
 * SML：只檢查單據身份 numberPrefix+number 不可重複。
 * Quote Number（invoiceNumber）可與其他 SML 相同，以便多張報價掛同一 Project。
 */
function buildSmlDocumentIdentityClauses(identity) {
  const { prefix, number } = identity;
  if (!prefix || !number) return [];
  return [
    { numberPrefix: prefix, number },
    {
      numberPrefix: new RegExp(`^${escapeRegex(prefix)}$`, 'i'),
      number,
    },
  ];
}

function formatDocLabel(dup) {
  if (dup.numberPrefix && dup.number != null && String(dup.number).trim() !== '') {
    return `${dup.numberPrefix}-${dup.number}`;
  }
  return dup.invoiceNumber && String(dup.invoiceNumber).trim()
    ? String(dup.invoiceNumber).trim()
    : '—';
}

async function findDuplicate(Model, baseFilter, orClauses) {
  if (!orClauses.length) return null;
  return Model.findOne({ ...baseFilter, $or: orClauses })
    .select('_id invoiceNumber numberPrefix number type')
    .lean();
}

/**
 * 報價單（Quote）與吊船報價（ShipQuote）共用 SML 單據編號：
 * - SML-{n} 的 numberPrefix+number 在兩邊不可重複（建立／修改皆檢查）
 * - Quote Number（invoiceNumber）允許重複，多張單可掛同一 Project
 * - QU 前綴仍只在 Quote 內、同 type 不可重複（含 invoiceNumber）
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

  const orShared = buildSmlDocumentIdentityClauses(identity);
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
