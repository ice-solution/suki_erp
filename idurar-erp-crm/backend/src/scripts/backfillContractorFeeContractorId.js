/**
 * 為 Project.contractorFees[] 補上 contractorId（Xero EO 用 id 對 accountCode）。
 *
 * 對照規則（同 export resolve）：
 * 1. projectName 精確等於承辦商 name
 * 2. 否則最長前綴：projectName === name 或 projectName.startsWith(name + ' ')
 *    （例如「IC01-葉枳泓-泓利 L13」→「IC01-葉枳泓-泓利」）
 *
 * 安全預設：只預覽，不寫入。實際寫入請加 --apply
 *
 * 使用（在 idurar-erp-crm/backend，已設定 DATABASE）：
 *   node src/scripts/backfillContractorFeeContractorId.js
 *   node src/scripts/backfillContractorFeeContractorId.js --apply
 *
 * 選項：
 *   --apply     實際寫入 contractorFees[].contractorId
 *   --limit=N   只處理前 N 個專案（除錯用）
 *   --include-disabled  對照時包含 enabled:false 的承辦商
 */

require('module-alias/register');
const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

for (const filePath of globSync('./src/models/**/*.js')) {
  require(path.resolve(filePath));
}

const { matchContractorByProjectName } = require('@/helpers/projectContractorFees');

const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
};

function parseLimit() {
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  if (!arg) return null;
  const n = Number.parseInt(arg.split('=')[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasContractorId(val) {
  if (val == null || val === '') return false;
  const id = typeof val === 'object' && val._id ? String(val._id) : String(val).trim();
  return mongoose.Types.ObjectId.isValid(id);
}

async function run() {
  const apply = process.argv.includes('--apply');
  const includeDisabled = process.argv.includes('--include-disabled');
  const limit = parseLimit();

  if (!process.env.DATABASE) {
    console.error('❌ 請在 .env 設定 DATABASE');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE, mongoOptions);
  console.log('✅ 已連線資料庫');
  console.log(apply ? '⚠️  模式：寫入（--apply）' : 'ℹ️  模式：僅預覽（不加 --apply 不會寫入）\n');

  const Project = mongoose.model('Project');
  const Contractor = mongoose.model('Contractor');

  const contractorQuery = { removed: false };
  if (!includeDisabled) contractorQuery.enabled = true;

  const contractors = await Contractor.find(contractorQuery)
    .select('_id name accountCode enabled')
    .lean()
    .exec();

  console.log(`承辦商主檔：${contractors.length} 筆${includeDisabled ? '（含停用）' : '（僅啟用）'}\n`);

  const stats = {
    projectsScanned: 0,
    projectsWithFees: 0,
    feeLinesScanned: 0,
    feeLinesAlreadyHasId: 0,
    feeLinesNoName: 0,
    feeLinesMatched: 0,
    feeLinesNoMatch: 0,
    projectsWouldUpdate: 0,
    projectsUpdated: 0,
    saveErrors: 0,
  };

  const matchedSamples = [];
  const noMatchSamples = [];

  let q = Project.find({ removed: false })
    .select('name invoiceNumber contractorFees')
    .sort({ updated: -1 });
  if (limit) q = q.limit(limit);

  const cursor = q.cursor();

  for await (const doc of cursor) {
    stats.projectsScanned += 1;
    const fees = doc.contractorFees;
    if (!Array.isArray(fees) || fees.length === 0) continue;

    stats.projectsWithFees += 1;
    let docDirty = false;

    for (let i = 0; i < fees.length; i += 1) {
      const fee = fees[i];
      stats.feeLinesScanned += 1;

      if (hasContractorId(fee.contractorId)) {
        stats.feeLinesAlreadyHasId += 1;
        continue;
      }

      const projectName = fee?.projectName != null ? String(fee.projectName).trim() : '';
      if (!projectName) {
        stats.feeLinesNoName += 1;
        continue;
      }

      const matched = matchContractorByProjectName(projectName, contractors);
      if (!matched) {
        stats.feeLinesNoMatch += 1;
        if (noMatchSamples.length < 50) {
          noMatchSamples.push({
            projectId: String(doc._id),
            projectName: doc.name || '',
            invoiceNumber: doc.invoiceNumber || '',
            feeIndex: i,
            feeProjectName: projectName,
          });
        }
        continue;
      }

      fee.contractorId = matched._id;
      docDirty = true;
      stats.feeLinesMatched += 1;

      if (matchedSamples.length < 40) {
        matchedSamples.push({
          projectId: String(doc._id),
          projectName: doc.name || '',
          feeProjectName: projectName,
          matchedContractor: matched.name,
          contractorId: String(matched._id),
          accountCode: matched.accountCode || '',
          matchType: String(matched.name).trim() === projectName ? 'exact' : 'prefix',
        });
      }
    }

    if (docDirty && apply) {
      try {
        doc.markModified('contractorFees');
        await doc.save();
        stats.projectsUpdated += 1;
      } catch (e) {
        stats.saveErrors += 1;
        console.error(`❌ 儲存失敗 Project ${doc._id}:`, e.message);
      }
    } else if (docDirty && !apply) {
      stats.projectsWouldUpdate += 1;
    }
  }

  await cursor.close();

  console.log('\n── 統計 ──');
  console.log(JSON.stringify(stats, null, 2));

  if (matchedSamples.length) {
    console.log('\n── 將寫入／已匹配樣本（前幾筆）──');
    console.log(JSON.stringify(matchedSamples, null, 2));
  }

  if (noMatchSamples.length) {
    console.log('\n── 對唔到承辦商（前幾筆，請人手核對）──');
    console.log(JSON.stringify(noMatchSamples, null, 2));
  }

  if (!apply && stats.feeLinesMatched > 0) {
    console.log(
      `\n預覽：約 ${stats.projectsWouldUpdate} 個專案會被更新（共 ${stats.feeLinesMatched} 行判頭費將寫入 contractorId）。\n若要寫入，請執行：\n  node src/scripts/backfillContractorFeeContractorId.js --apply`
    );
  }

  await mongoose.disconnect();
  console.log('\n✅ 完成');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
