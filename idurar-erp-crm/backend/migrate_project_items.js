const mongoose = require('mongoose');
require('./src/models/appModels/ProjectItem');

const ProjectItem = mongoose.model('ProjectItem');

// Mock data from QuoteTableForm.jsx
const mockProjectItems = [
  { item_name: '水泥', price: 500, description: '高級水泥', category: '建材' },
  { item_name: '鋼筋', price: 800, description: '建築用鋼筋', category: '建材' },
  { item_name: '磚塊', price: 200, description: '紅磚', category: '建材' },
  { item_name: '玻璃', price: 300, description: '建築玻璃', category: '建材' },
  { item_name: '木材', price: 600, description: '建築木材', category: '建材' },
  { item_name: '油漆', price: 150, description: '內牆油漆', category: '建材' },
  { item_name: '電線', price: 100, description: '電力線材', category: '設備' },
  { item_name: '管道', price: 250, description: '水管', category: '設備' },
];

async function migrateProjectItems() {
  try {
    // 連接數據庫
    await mongoose.connect('mongodb+srv://idurar:idurar@idurar.wgbuy.mongodb.net/suki_erp?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // 檢查是否已有數據
    const existingCount = await ProjectItem.countDocuments({ removed: false });
    console.log(`📊 Existing ProjectItems: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️ ProjectItems already exist, skipping migration');
      return;
    }

    // 創建管理員ID（需要一個有效的Admin ID）
    const AdminModel = mongoose.model('Admin');
    const admin = await AdminModel.findOne({ removed: false });
    
    if (!admin) {
      console.error('❌ No admin found, cannot create ProjectItems');
      return;
    }

    console.log('👤 Using admin:', admin.name || admin._id);

    // 遷移數據
    const itemsToCreate = mockProjectItems.map(item => ({
      itemName: item.item_name,
      description: item.description,
      price: item.price,
      category: item.category || '建材',
      unit: '個',
      isFrequent: true, // 標記為常用項目
      createdBy: admin._id,
    }));

    const result = await ProjectItem.insertMany(itemsToCreate);
    console.log(`✅ Successfully migrated ${result.length} ProjectItems:`);
    
    result.forEach(item => {
      console.log(`  - ${item.itemName}: $${item.price}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// 執行遷移
if (require.main === module) {
  migrateProjectItems().then(() => {
    console.log('🎉 Migration completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });
}

module.exports = migrateProjectItems;
