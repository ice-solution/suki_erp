const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const SequenceCounter = mongoose.model('SequenceCounter');

const KEY = 'usedContractorFeeEo';
const EO_PREFIX = 'EO-';
const PAD_LEN = 4;

function formatEo(n) {
  return `${EO_PREFIX}${String(n).padStart(PAD_LEN, '0')}`;
}

function parseEoNumber(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^EO-(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

async function getMaxEoFromProjects() {
  const rows = await Project.aggregate([
    { $match: { removed: false } },
    { $unwind: { path: '$usedContractorFees', preserveNullAndEmptyArrays: false } },
    { $project: { eo: '$usedContractorFees.eoNumber' } },
  ]);
  let max = 0;
  for (const r of rows) {
    const n = parseEoNumber(r.eo);
    if (n !== null && n > max) max = n;
  }
  return max;
}

/**
 * 確保計數器 seq 至少為全庫既有 EO 數字最大值（含手動輸入的 EO-xxxx）。
 */
async function ensureCounterAtLeastFloor() {
  const maxDb = await getMaxEoFromProjects();
  try {
    await SequenceCounter.updateOne(
      { key: KEY },
      { $setOnInsert: { seq: maxDb } },
      { upsert: true }
    );
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  await SequenceCounter.updateOne(
    { key: KEY, seq: { $lt: maxDb } },
    { $max: { seq: maxDb } }
  );
}

/**
 * 原子取得下一批全站唯一的 EO 編號字串（EO-0001 格式）。
 * @param {number} count 需要幾個連號
 * @returns {Promise<string[]>}
 */
async function allocateNextEoNumbers(count) {
  if (!count || count < 1) return [];
  await ensureCounterAtLeastFloor();
  const updated = await SequenceCounter.findOneAndUpdate(
    { key: KEY },
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );
  const end = updated.seq;
  const start = end - count + 1;
  const out = [];
  for (let i = start; i <= end; i += 1) {
    out.push(formatEo(i));
  }
  return out;
}

function needsAutoEo(eoNumber) {
  if (eoNumber === undefined || eoNumber === null) return true;
  if (typeof eoNumber !== 'string') return true;
  return eoNumber.trim() === '';
}

/**
 * 預覽「下一筆」將指派的 EO（不遞增計數器）。
 * 若多人同時操作，實際儲存時可能已變成下一號。
 */
async function peekNextUsedContractorFeeEo() {
  await ensureCounterAtLeastFloor();
  const doc = await SequenceCounter.findOne({ key: KEY }).lean();
  const current = doc && typeof doc.seq === 'number' ? doc.seq : 0;
  return formatEo(current + 1);
}

module.exports = {
  allocateNextEoNumbers,
  peekNextUsedContractorFeeEo,
  formatEo,
  parseEoNumber,
  needsAutoEo,
  KEY,
};
