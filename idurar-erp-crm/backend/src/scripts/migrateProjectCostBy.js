/**
 * 將 Project.costBy 舊值遷移為新值：
 *   對方 → 其他公司代工
 *   我方 → 超越代工
 *
 * 安全預設：只預覽。實際寫入請加 --apply
 *
 * 用法（在 idurar-erp-crm/backend）：
 *   node src/scripts/migrateProjectCostBy.js
 *   node src/scripts/migrateProjectCostBy.js --apply
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

const { COST_BY_LEGACY_MAP, normalizeCostBy } = require('@/helpers/projectCostBy');

const Project = mongoose.model('Project');

const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
};

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.DATABASE;
  if (!uri) {
    throw new Error('缺少 DATABASE 環境變數');
  }

  await mongoose.connect(uri, mongoOptions);

  const legacyValues = Object.keys(COST_BY_LEGACY_MAP);
  const docs = await Project.find({ costBy: { $in: legacyValues } })
    .select('_id invoiceNumber costBy')
    .lean();

  console.log(`找到 ${docs.length} 筆需遷移（apply=${apply}）`);

  let updated = 0;
  for (const doc of docs) {
    const next = normalizeCostBy(doc.costBy);
    console.log(`  ${doc.invoiceNumber || doc._id}: ${doc.costBy} → ${next}`);
    if (apply) {
      await Project.updateOne({ _id: doc._id }, { $set: { costBy: next } });
      updated += 1;
    }
  }

  console.log(apply ? `已更新 ${updated} 筆` : 'dry-run 完成；加上 --apply 才會寫入');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
