/**
 * 移除 Project 模型中 poNumber 字段的唯一索引
 * 
 * 這個腳本用於修復數據庫中錯誤設置的 poNumber 唯一索引。
 * poNumber 不是唯一字段，不應該有唯一索引約束。
 */

require('module-alias/register');
const mongoose = require('mongoose');

// 載入環境變量
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const removePoNumberUniqueIndex = async () => {
  try {
    // 連接到 MongoDB
    if (!process.env.DATABASE) {
      console.error('❌ 錯誤: DATABASE 環境變量未設置');
      console.error('   請確保 .env 或 .env.local 文件中設置了 DATABASE 變量');
      process.exit(1);
    }

    const mongoOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority',
    };

    await mongoose.connect(process.env.DATABASE, mongoOptions);

    console.log('✅ 已連接到數據庫');

    const db = mongoose.connection.db;
    const collection = db.collection('projects');

    // 獲取當前所有索引
    const indexes = await collection.indexes();
    console.log('📋 當前索引列表:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
    });

    // 檢查是否存在 poNumber_1 索引
    const poNumberIndex = indexes.find(index => index.name === 'poNumber_1');
    
    if (poNumberIndex) {
      console.log('\n🔍 發現 poNumber_1 唯一索引，準備移除...');
      
      // 移除 poNumber_1 唯一索引
      await collection.dropIndex('poNumber_1');
      console.log('✅ 成功移除 poNumber_1 唯一索引');
    } else {
      console.log('\n✅ 沒有發現 poNumber_1 索引，無需移除');
    }

    // 確認索引已移除
    const updatedIndexes = await collection.indexes();
    console.log('\n📋 更新後的索引列表:');
    updatedIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
    });

    console.log('\n✅ 完成！poNumber 字段現在不再是唯一索引');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 錯誤:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// 運行腳本
if (require.main === module) {
  removePoNumberUniqueIndex();
}

module.exports = removePoNumberUniqueIndex;

