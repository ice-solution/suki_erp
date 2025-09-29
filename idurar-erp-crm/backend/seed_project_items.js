const mongoose = require('mongoose');
require('./src/models/appModels/ProjectItem');
require('./src/models/coreModels/Admin');

const ProjectItem = mongoose.model('ProjectItem');
const Admin = mongoose.model('Admin');

// Mock data from QuoteTableForm.jsx
const mockProjectItems = [
  { item_name: '水泥', price: 500, description: '高級水泥', category: '建材', unit: '包' },
  { item_name: '鋼筋', price: 800, description: '建築用鋼筋', category: '建材', unit: '噸' },
  { item_name: '磚塊', price: 200, description: '紅磚', category: '建材', unit: '塊' },
  { item_name: '玻璃', price: 300, description: '建築玻璃', category: '建材', unit: '平方米' },
  { item_name: '木材', price: 600, description: '建築木材', category: '建材', unit: '立方米' },
  { item_name: '油漆', price: 150, description: '內牆油漆', category: '建材', unit: '桶' },
  { item_name: '電線', price: 100, description: '電力線材', category: '設備', unit: '米' },
  { item_name: '管道', price: 250, description: '水管', category: '設備', unit: '米' },
];

async function seedProjectItems() {
  try {
    // 連接數據庫
    await mongoose.connect('mongodb+srv://idurar:idurar@idurar.wgbuy.mongodb.net/suki_erp?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // 檢查是否已有數據
    const existingCount = await ProjectItem.countDocuments({ removed: false });
    console.log(`📊 Existing ProjectItems: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️ ProjectItems already exist, clearing and recreating...');
      // 清除現有數據
      await ProjectItem.updateMany({}, { removed: true });
    }

    // 獲取管理員ID
    const admin = await Admin.findOne({ removed: false });
    
    if (!admin) {
      console.error('❌ No admin found, cannot create ProjectItems');
      return;
    }

    console.log('👤 Using admin:', admin.name || admin._id);

    // 創建項目數據
    const itemsToCreate = mockProjectItems.map(item => ({
      itemName: item.item_name,
      description: item.description,
      price: item.price,
      category: item.category || '建材',
      unit: item.unit || '個',
      isFrequent: true, // 標記為常用項目
      enabled: true,
      removed: false,
      createdBy: admin._id,
    }));

    console.log('🔄 Creating ProjectItems...');
    const results = [];
    
    for (const itemData of itemsToCreate) {
      try {
        const item = new ProjectItem(itemData);
        const savedItem = await item.save();
        results.push(savedItem);
        console.log(`✅ Created: ${savedItem.itemName} - $${savedItem.price}`);
      } catch (error) {
        console.error(`❌ Failed to create ${itemData.itemName}:`, error.message);
      }
    }

    console.log(`🎉 Successfully created ${results.length} ProjectItems!`);
    
    // 列出所有創建的項目
    console.log('\n📋 Created ProjectItems:');
    results.forEach((item, index) => {
      console.log(`${index + 1}. ${item.itemName} - $${item.price} (${item.unit}) [${item.category}]`);
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// 執行seed
if (require.main === module) {
  seedProjectItems().then(() => {
    console.log('🎉 Seed completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Seed error:', error);
    process.exit(1);
  });
}

module.exports = seedProjectItems;


