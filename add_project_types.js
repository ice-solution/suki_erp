require('module-alias/register');
const mongoose = require('mongoose');

async function addProjectTypes() {
  try {
    // 連接資料庫
    await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:27017/idurarcrm');
    console.log('已連接資料庫');
    
    const ProjectType = require('./src/models/appModels/ProjectType');
    
    // 檢查現有項目類型
    console.log('=== 現有項目類型 ===');
    const existingTypes = await ProjectType.find({ removed: false }, 'name description color sortOrder');
    existingTypes.forEach((type, index) => {
      console.log(`${index + 1}. ${type.name} - ${type.description}`);
    });
    
    // 檢查是否已存在「一般」和「吊船」
    const generalExists = await ProjectType.findOne({ name: '一般', removed: false });
    const craneExists = await ProjectType.findOne({ name: '吊船', removed: false });
    
    const newTypes = [];
    
    if (!generalExists) {
      newTypes.push({
        name: '一般',
        description: '一般項目類型',
        color: '#722ed1',
        sortOrder: 10,
        enabled: true,
        removed: false
      });
    } else {
      console.log('「一般」類型已存在');
    }
    
    if (!craneExists) {
      newTypes.push({
        name: '吊船',
        description: '吊船相關項目',
        color: '#fa8c16',
        sortOrder: 11,
        enabled: true,
        removed: false
      });
    } else {
      console.log('「吊船」類型已存在');
    }
    
    if (newTypes.length > 0) {
      await ProjectType.insertMany(newTypes);
      console.log(`\n✅ 新增了 ${newTypes.length} 個項目類型!`);
      newTypes.forEach(type => {
        console.log(`  + ${type.name} - ${type.description}`);
      });
    } else {
      console.log('\n所有項目類型已存在，無需新增');
    }
    
    // 顯示最終的項目類型列表
    console.log('\n=== 最終項目類型列表 ===');
    const allTypes = await ProjectType.find({ removed: false }, 'name description color sortOrder').sort({ sortOrder: 1 });
    allTypes.forEach((type, index) => {
      console.log(`${index + 1}. ${type.name} - ${type.description} (${type.color})`);
    });
    
    await mongoose.connection.close();
    console.log('\n資料庫連接已關閉');
    
  } catch (error) {
    console.error('❌ 操作失敗:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

addProjectTypes();
