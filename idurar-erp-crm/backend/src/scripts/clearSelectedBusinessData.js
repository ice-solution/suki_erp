/**
 * 清空側欄指定業務模組資料（實際 deleteMany，非 soft-delete）
 *
 * 清空範圍（對應選單）：
 *   1. 報價單          → Quote
 *   2. 吊船報價        → ShipQuote
 *   3. S單             → SupplierQuote + SupplierQuoteAssetBinding
 *   4. 船隻管理        → Ship
 *   5. 爬纜器管理      → Winch
 *   6. 發票            → Invoice + Payment（發票付款紀錄）
 *   7. 項目管理        → Project + WorkProgress
 *   8. 存倉管理        → WarehouseInventory + WarehouseTransaction
 *
 * 刪除順序已考慮互相引用（先刪「指向別人」的資料，再刪主檔），
 * 避免留下 orphan 連結鍵／殘留綁定。
 *
 * 保留（唔動）：
 *   - 客戶 Client、供應商 Supplier
 *   - 登入 Admin / AdminPassword
 *   - 系統設定 Setting（含最後號碼）
 *   - 會計科目、Journal、PaymentMode、ProjectItem（項目範本）等
 *
 * 使用（必須在 backend 目錄，且 .env 有 DATABASE）：
 *   # 只預覽會刪幾多筆（唔真刪）
 *   node src/scripts/clearSelectedBusinessData.js --dry-run
 *
 *   # 確認後真刪
 *   node src/scripts/clearSelectedBusinessData.js --confirm
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

const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
};

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

/**
 * 由葉到根：先清交易／綁定／付款，再清單據，最後清資產與專案。
 * MongoDB 無強制 FK，但按此順序可減少殘留引用。
 */
const CLEAR_ORDER = [
  // 存倉（交易先於庫存；交易亦可能引用 Project / S單）
  { model: 'WarehouseTransaction', label: '存倉管理 · 倉存交易' },
  { model: 'WarehouseInventory', label: '存倉管理 · 庫存' },

  // 發票（付款先於發票）
  { model: 'Payment', label: '發票 · 付款紀錄' },
  { model: 'Invoice', label: '發票' },

  // S單（資產綁定歷史先於 S單本體）
  { model: 'SupplierQuoteAssetBinding', label: 'S單 · 船隻/爬纜器綁定' },
  { model: 'SupplierQuote', label: 'S單' },

  // 報價
  { model: 'ShipQuote', label: '吊船報價' },
  { model: 'Quote', label: '報價單' },

  // 項目（進度先於專案）
  { model: 'WorkProgress', label: '項目管理 · 工程進度' },
  { model: 'Project', label: '項目管理' },

  // 資產主檔（S單／綁定已清後再刪）
  { model: 'Ship', label: '船隻管理' },
  { model: 'Winch', label: '爬纜器管理' },
];

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const confirm = process.argv.includes('--confirm');

  if (!dryRun && !confirm) {
    console.error('❌ 為避免誤刪，請擇一：');
    console.error('   node src/scripts/clearSelectedBusinessData.js --dry-run   # 只統計');
    console.error('   node src/scripts/clearSelectedBusinessData.js --confirm  # 真刪');
    process.exit(1);
  }

  if (!process.env.DATABASE) {
    console.error('❌ 請在 .env / .env.local 設定 DATABASE');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE, mongoOptions);
  console.log(`✅ 已連線資料庫${dryRun ? '（dry-run，不會刪除）' : '（將永久刪除）'}\n`);

  let total = 0;

  for (const { model, label } of CLEAR_ORDER) {
    const M = getModel(model);
    if (!M) {
      console.log(`⏭️  略過（無模型）: ${label} [${model}]`);
      continue;
    }

    const count = await M.countDocuments({});
    if (dryRun) {
      console.log(`📊 ${label}: ${count} 筆`);
      total += count;
      continue;
    }

    const r = await M.deleteMany({});
    const n = r.deletedCount || 0;
    total += n;
    console.log(`🗑️  ${label}: 已刪除 ${n} 筆`);
  }

  console.log(
    dryRun
      ? `\n✅ 預覽完成，合共會刪除約 ${total} 筆文件（未實際刪除）`
      : `\n✅ 完成，合計刪除 ${total} 筆文件`
  );
  console.log('ℹ️  未動：客戶、供應商、帳號、系統設定（含最後號碼）、會計等');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌', err);
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  process.exit(1);
});
