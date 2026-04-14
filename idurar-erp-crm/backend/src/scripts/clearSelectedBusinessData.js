/**
 * 清空指定業務模組資料（實際 deleteMany，非軟刪）
 *
 * 範圍：
 *   - 報價單 Quote
 *   - S 單 SupplierQuote（含 SupplierQuoteAssetBinding）
 *   - 吊船 ShipQuote
 *   - 發票 Invoice（先刪 Payment）
 *   - Project 專案管理（先刪 WorkProgress）
 *   - 存倉 WarehouseInventory + WarehouseTransaction
 *
 * 不動：客戶、供應商、設定、帳號、會計科目、Journal 等。
 *
 * 使用（須在 backend 目錄，且已設定 DATABASE）：
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

async function run() {
  if (!process.argv.includes('--confirm')) {
    console.error(
      '❌ 為避免誤刪，請加上參數：  node src/scripts/clearSelectedBusinessData.js --confirm'
    );
    process.exit(1);
  }
  if (!process.env.DATABASE) {
    console.error('❌ 請在 .env 設定 DATABASE');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE, mongoOptions);
  console.log('✅ 已連線資料庫\n');

  const models = {
    WarehouseTransaction: mongoose.model('WarehouseTransaction'),
    WarehouseInventory: mongoose.model('WarehouseInventory'),
    Payment: mongoose.model('Payment'),
    Invoice: mongoose.model('Invoice'),
    SupplierQuoteAssetBinding: null,
    SupplierQuote: mongoose.model('SupplierQuote'),
    ShipQuote: mongoose.model('ShipQuote'),
    Quote: mongoose.model('Quote'),
    WorkProgress: mongoose.model('WorkProgress'),
    Project: mongoose.model('Project'),
  };

  try {
    models.SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');
  } catch {
    // optional model
  }

  const order = [
    ['WarehouseTransaction', '倉存交易紀錄'],
    ['WarehouseInventory', '倉存庫存'],
    ['Payment', '付款（關聯發票）'],
    ['Invoice', '發票'],
    ['SupplierQuoteAssetBinding', 'S單資產綁定'],
    ['SupplierQuote', 'S 單'],
    ['ShipQuote', '吊船 Quote'],
    ['Quote', '報價單'],
    ['WorkProgress', '工程進度（關聯專案）'],
    ['Project', '專案 Project'],
  ];

  let total = 0;
  for (const [key, label] of order) {
    const M = models[key];
    if (!M) {
      console.log(`⏭️  略過（無模型）: ${label}`);
      continue;
    }
    const r = await M.deleteMany({});
    const n = r.deletedCount || 0;
    total += n;
    console.log(`🗑️  ${label}: 已刪除 ${n} 筆`);
  }

  console.log(`\n✅ 完成，合計刪除 ${total} 筆文件`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌', err);
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  process.exit(1);
});
