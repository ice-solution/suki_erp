const mongoose = require('mongoose');

function newLineId() {
  return new mongoose.Types.ObjectId().toString();
}

function ensureContractorFeeLineIds(contractorFees, existingFees = []) {
  const existingByIndex = [...(existingFees || [])];

  return (contractorFees || []).map((fee, index) => {
    const projectName = fee?.projectName != null ? String(fee.projectName).trim() : '';
    const amount = Number(fee?.amount) || 0;
    let lineId =
      fee?.lineId && String(fee.lineId).trim() ? String(fee.lineId).trim() : null;
    if (!lineId && existingByIndex[index]?.lineId) {
      lineId = String(existingByIndex[index].lineId);
    }
    if (!lineId) lineId = newLineId();

    let contractorId =
      fee?.contractorId != null && String(fee.contractorId).trim()
        ? String(fee.contractorId).trim()
        : null;
    if (!contractorId && existingByIndex[index]?.contractorId) {
      contractorId = String(existingByIndex[index].contractorId);
    }

    return {
      lineId,
      projectName,
      amount,
      ...(contractorId ? { contractorId } : {}),
    };
  });
}

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

function formatFeeLineLabel(fee, index, allFees) {
  const name = fee.projectName || '判頭費';
  const ord = getDuplicateOrdinal(index, allFees);
  if (ord != null) return `(${ord}) ${name}`;
  return name;
}

function allocateUsedByLineId(contractorFees, usedContractorFees) {
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

/**
 * 對照承辦商 accountCode。
 * 優先 contractorId；否則依 projectName 精確／最長前綴匹配（相容舊資料）。
 */
function resolveContractorAccountCode(feeProjectName, contractors, contractorId) {
  if (Array.isArray(contractors) && contractors.length) {
    if (contractorId) {
      const id = String(contractorId);
      const byId = contractors.find((c) => String(c?._id || '') === id);
      if (byId) return String(byId.accountCode || '').trim();
    }

    const name = String(feeProjectName || '').trim();
    if (name) {
      const exact = contractors.find((c) => String(c?.name || '').trim() === name);
      if (exact) return String(exact.accountCode || '').trim();

      let best = null;
      for (const c of contractors) {
        const cn = String(c?.name || '').trim();
        if (!cn) continue;
        if (name === cn || name.startsWith(`${cn} `)) {
          if (!best || cn.length > String(best.name || '').length) best = c;
        }
      }
      if (best) return String(best.accountCode || '').trim();
    }
  }
  return '';
}

/** 依 projectName 對照承辦商（精確／最長前綴）；供 migration 用 */
function matchContractorByProjectName(feeProjectName, contractors) {
  const name = String(feeProjectName || '').trim();
  if (!name || !Array.isArray(contractors) || !contractors.length) return null;

  const exact = contractors.find((c) => String(c?.name || '').trim() === name);
  if (exact) return exact;

  let best = null;
  for (const c of contractors) {
    const cn = String(c?.name || '').trim();
    if (!cn) continue;
    if (name === cn || name.startsWith(`${cn} `)) {
      if (!best || cn.length > String(best.name || '').length) best = c;
    }
  }
  return best;
}

function normalizeUsedContractorFees(usedContractorFees, contractorFees) {
  const fees = ensureContractorFeeLineIds(contractorFees);
  const feeByLineId = new Map(fees.map((f) => [f.lineId, f]));

  return (usedContractorFees || []).map((f) => {
    const projectName = f && f.projectName !== undefined ? String(f.projectName) : '';
    let contractorFeeLineId =
      f?.contractorFeeLineId != null && String(f.contractorFeeLineId).trim()
        ? String(f.contractorFeeLineId).trim()
        : '';
    if (!contractorFeeLineId && projectName) {
      const sameName = fees.filter((x) => (x.projectName || '').trim() === projectName.trim());
      if (sameName.length === 1) contractorFeeLineId = sameName[0].lineId;
    }
    const linked = contractorFeeLineId ? feeByLineId.get(contractorFeeLineId) : null;
    return {
      contractorFeeLineId: contractorFeeLineId || undefined,
      projectName: linked?.projectName ?? projectName,
      date: f && f.date ? new Date(f.date) : new Date(),
      dueDate: f && f.dueDate ? new Date(f.dueDate) : null,
      eoNumber:
        f && f.eoNumber !== undefined && f.eoNumber !== null ? String(f.eoNumber).trim() : '',
      invoiceNo:
        f && f.invoiceNo !== undefined && f.invoiceNo !== null
          ? String(f.invoiceNo).trim()
          : '',
      remark:
        f && f.remark !== undefined && f.remark !== null ? String(f.remark).trim() : '',
      amount: f && f.amount !== undefined && f.amount !== null ? f.amount : 0,
    };
  });
}

module.exports = {
  newLineId,
  ensureContractorFeeLineIds,
  formatFeeLineLabel,
  allocateUsedByLineId,
  normalizeUsedContractorFees,
  resolveContractorAccountCode,
  matchContractorByProjectName,
};
