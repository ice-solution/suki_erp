import { generate as uniqueId } from 'shortid';

export function newContractorFeeLineId() {
  return uniqueId();
}

export function ensureContractorFeeLineIds(contractorFees, existingFees = []) {
  const existingByIndex = [...(existingFees || [])];

  return (contractorFees || []).map((fee, index) => {
    const projectName = fee?.projectName != null ? String(fee.projectName).trim() : '';
    const amount = Number(fee?.amount) || 0;
    let lineId =
      fee?.lineId && String(fee.lineId).trim() ? String(fee.lineId).trim() : null;
    if (!lineId && existingByIndex[index]?.lineId) {
      lineId = String(existingByIndex[index].lineId);
    }
    if (!lineId) lineId = newContractorFeeLineId();
    return { lineId, projectName, amount };
  });
}

/** 同名判頭費中的序號（1-based）；僅一名稱時回傳 null */
function getDuplicateOrdinal(index, allFees) {
  const name = (allFees[index]?.projectName || '').trim();
  if (!name) return null;
  const sameNameIndices = (allFees || [])
    .map((f, i) => ((f?.projectName || '').trim() === name ? i : -1))
    .filter((i) => i >= 0);
  if (sameNameIndices.length <= 1) return null;
  const pos = sameNameIndices.indexOf(index);
  return pos >= 0 ? pos + 1 : null;
}

export function formatFeeLineShortLabel(fee, index, allFees) {
  const name = fee.projectName || '判頭費';
  const ord = getDuplicateOrdinal(index, allFees);
  if (ord != null) return `(${ord}) ${name}`;
  return name;
}

export function formatFeeLineLabel(fee, index, allFees) {
  return formatFeeLineShortLabel(fee, index, allFees);
}

export function buildContractorFeeLineOptions(contractorFees) {
  const fees = ensureContractorFeeLineIds(contractorFees);
  return fees.map((fee, index) => ({
    value: fee.lineId,
    label: formatFeeLineLabel(fee, index, fees),
    projectName: fee.projectName,
    amount: fee.amount,
  }));
}

export function allocateUsedByLineId(contractorFees, usedContractorFees) {
  const fees = ensureContractorFeeLineIds(contractorFees);
  const usedByLineId = {};
  fees.forEach((f) => {
    usedByLineId[f.lineId] = 0;
  });

  const legacyUsed = [];

  (usedContractorFees || []).forEach((u) => {
    const amt = Number(u?.amount) || 0;
    if (amt <= 0) return;
    const lineId =
      u?.contractorFeeLineId != null && String(u.contractorFeeLineId).trim()
        ? String(u.contractorFeeLineId).trim()
        : '';
    if (lineId && Object.prototype.hasOwnProperty.call(usedByLineId, lineId)) {
      usedByLineId[lineId] += amt;
      return;
    }
    legacyUsed.push({ ...u, remaining: amt });
  });

  legacyUsed.forEach((u) => {
    const name = (u.projectName || '').trim();
    let left = u.remaining;
    for (const fee of fees) {
      if ((fee.projectName || '').trim() !== name) continue;
      const cap = Number(fee.amount) || 0;
      const used = usedByLineId[fee.lineId] || 0;
      const room = Math.max(0, cap - used);
      if (room <= 0) continue;
      const take = Math.min(left, room);
      usedByLineId[fee.lineId] += take;
      left -= take;
      if (left <= 0) break;
    }
    if (left > 0) {
      const target = fees.find((f) => (f.projectName || '').trim() === name);
      if (target) usedByLineId[target.lineId] = (usedByLineId[target.lineId] || 0) + left;
    }
  });

  return { fees, usedByLineId };
}

export function getFeeLineLabel(lineId, contractorFees) {
  const fees = ensureContractorFeeLineIds(contractorFees);
  const index = fees.findIndex((f) => f.lineId === lineId);
  if (index < 0) return null;
  return formatFeeLineLabel(fees[index], index, fees);
}
