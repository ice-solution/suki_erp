/**
 * 將 S 單（SupplierQuote）材料列中，倉 A–D 且尚未帶 warehouseInventory 的項目，
 * 依「倉庫 + 貨品名稱」對應到 WarehouseInventory._id 並寫回（與前端改為以 ObjectId 扣帳一致）。
 *
 * 安全預設：不寫入資料庫，只統計與列出將變更／無法對應的項目。
 * 實際寫入請加上：--apply
 *
 * 使用（在 idurar-erp-crm/backend 目錄，已設定 DATABASE）：
 *   node src/scripts/backfillSupplierQuoteWarehouseInventory.js
 *   node src/scripts/backfillSupplierQuoteWarehouseInventory.js --apply
 *
 * 選項：
 *   --apply   實際更新 SupplierQuote.materials[].warehouseInventory
 *   --limit=N 只處理前 N 張 S 單（除錯用）
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

const WAREHOUSE_KEYS = new Set(['A', 'B', 'C', 'D']);

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

function hasValidInventoryRef(val) {
  if (val == null || val === '') return false;
  const id = typeof val === 'object' && val._id ? String(val._id) : String(val).trim();
  return mongoose.Types.ObjectId.isValid(id);
}

async function run() {
  const apply = process.argv.includes('--apply');
  const limit = parseLimit();

  if (!process.env.DATABASE) {
    console.error('❌ 請在 .env 設定 DATABASE');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE, mongoOptions);
  console.log('✅ 已連線資料庫');
  console.log(apply ? '⚠️  模式：寫入（--apply）' : 'ℹ️  模式：僅預覽（不加 --apply 不會寫入）\n');

  const SupplierQuote = mongoose.model('SupplierQuote');
  const WarehouseInventory = mongoose.model('WarehouseInventory');

  const stats = {
    quotesScanned: 0,
    linesNeedingFill: 0,
    linesFilled: 0,
    linesSkippedAlreadyHasId: 0,
    linesSkippedNonStockWh: 0,
    linesSkippedNoItemName: 0,
    linesSkippedProcessingFee: 0,
    noInventoryMatch: 0,
    duplicateInventory: 0,
    quotesWouldUpdate: 0,
    quotesUpdated: 0,
    saveErrors: 0,
  };

  const noMatchSamples = [];
  const duplicateSamples = [];

  const query = { removed: false };
  let q = SupplierQuote.find(query).sort({ updated: -1 });
  if (limit) q = q.limit(limit);

  const cursor = q.cursor();

  for await (const doc of cursor) {
    stats.quotesScanned += 1;
    if (!doc.materials || !doc.materials.length) continue;

    let docDirty = false;

    for (let i = 0; i < doc.materials.length; i += 1) {
      const m = doc.materials[i];
      const wh = String(m.warehouse || '').trim();

      if (!WAREHOUSE_KEYS.has(wh)) {
        stats.linesSkippedNonStockWh += 1;
        continue;
      }

      if (m.accountingType === 'processing_fee') {
        stats.linesSkippedProcessingFee += 1;
        continue;
      }

      if (hasValidInventoryRef(m.warehouseInventory)) {
        stats.linesSkippedAlreadyHasId += 1;
        continue;
      }

      const itemName = m.itemName != null ? String(m.itemName).trim() : '';
      if (!itemName) {
        stats.linesSkippedNoItemName += 1;
        continue;
      }

      stats.linesNeedingFill += 1;

      const invs = await WarehouseInventory.find({
        removed: false,
        warehouse: wh,
        itemName,
      })
        .select('_id itemName warehouse')
        .limit(2)
        .lean();

      if (invs.length === 0) {
        stats.noInventoryMatch += 1;
        if (noMatchSamples.length < 30) {
          noMatchSamples.push({
            supplierQuoteId: String(doc._id),
            number: doc.numberPrefix && doc.number ? `${doc.numberPrefix}-${doc.number}` : doc.number,
            lineIndex: i,
            warehouse: wh,
            itemName,
          });
        }
        continue;
      }

      if (invs.length > 1) {
        stats.duplicateInventory += 1;
        if (duplicateSamples.length < 20) {
          duplicateSamples.push({
            supplierQuoteId: String(doc._id),
            number: doc.numberPrefix && doc.number ? `${doc.numberPrefix}-${doc.number}` : doc.number,
            lineIndex: i,
            warehouse: wh,
            itemName,
            count: invs.length,
          });
        }
        continue;
      }

      doc.materials[i].warehouseInventory = invs[0]._id;
      docDirty = true;
      stats.linesFilled += 1;
    }

    if (docDirty && apply) {
      try {
        doc.markModified('materials');
        await doc.save();
        stats.quotesUpdated += 1;
      } catch (e) {
        stats.saveErrors += 1;
        console.error(`❌ 儲存失敗 SupplierQuote ${doc._id}:`, e.message);
      }
    } else if (docDirty && !apply) {
      stats.quotesWouldUpdate += 1;
    }
  }

  await cursor.close();

  console.log('\n── 統計 ──');
  console.log(JSON.stringify(stats, null, 2));

  if (noMatchSamples.length) {
    console.log('\n── 無對應存倉貨品（前幾筆）──');
    console.log(JSON.stringify(noMatchSamples, null, 2));
  }

  if (duplicateSamples.length) {
    console.log('\n── 同一倉+貨名有多筆存倉（請手動整理後再跑）──');
    console.log(JSON.stringify(duplicateSamples, null, 2));
  }

  if (!apply && stats.linesFilled > 0) {
    console.log(
      `\n預覽：約 ${stats.quotesWouldUpdate} 張 S 單會被更新（共 ${stats.linesFilled} 列材料將寫入 warehouseInventory）。\n若要寫入，請執行：\n  node src/scripts/backfillSupplierQuoteWarehouseInventory.js --apply`
    );
  }

  await mongoose.disconnect();
  console.log('\n✅ 完成');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
