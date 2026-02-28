/**
 * 一次性腳本：刪除除「存倉管理」外的所有業務數據
 *
 * 保留：
 *   - 存倉管理：warehouseinventories, warehousetransactions
 *   - 系統登入：admins, adminpasswords, settings
 *
 * 其餘 collection 內所有文檔會被刪除（如 clients, projects, quotes, invoices, supplierquotes 等）。
 *
 * 使用：在 backend 目錄執行
 *   node src/scripts/deleteAllExceptWarehouse.js
 *
 * 需設置環境變量 DATABASE（.env 或 .env.local）
 */

require('module-alias/register');
const mongoose = require('mongoose');

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// 保留的 collection（小寫，與 MongoDB 實際名稱一致）
const KEEP_COLLECTIONS = new Set([
  'warehouseinventories',   // 存倉管理 - 庫存
  'warehousetransactions',  // 存倉管理 - 交易記錄
  'admins',                 // 管理員（保留登入）
  'adminpasswords',         // 管理員密碼
  'settings',               // 系統設定
]);

const deleteAllExceptWarehouse = async () => {
  try {
    if (!process.env.DATABASE) {
      console.error('❌ 錯誤: DATABASE 環境變量未設置');
      process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ 已連接到數據庫\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);

    let deletedCount = 0;
    let keptCount = 0;

    for (const name of names) {
      const keep = KEEP_COLLECTIONS.has(name.toLowerCase());
      const coll = db.collection(name);
      const count = await coll.countDocuments();

      if (keep) {
        console.log(`⏭️  保留: ${name} (${count} 筆)`);
        keptCount += count;
      } else {
        if (count > 0) {
          await coll.deleteMany({});
          console.log(`🗑️  已清空: ${name} (已刪 ${count} 筆)`);
          deletedCount += count;
        } else {
          console.log(`⬜ 跳過(空): ${name}`);
        }
      }
    }

    console.log('\n✅ 完成');
    console.log(`   已刪除文檔總數: ${deletedCount}`);
    console.log(`   保留文檔總數: ${keptCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 錯誤:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

if (require.main === module) {
  deleteAllExceptWarehouse();
}

module.exports = deleteAllExceptWarehouse;
