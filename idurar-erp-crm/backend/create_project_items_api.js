const axios = require('axios');

// Mock data to be inserted
const mockProjectItems = [
  { itemName: '水泥', price: 500, description: '高級水泥', category: '建材', unit: '包', isFrequent: true },
  { itemName: '鋼筋', price: 800, description: '建築用鋼筋', category: '建材', unit: '噸', isFrequent: true },
  { itemName: '磚塊', price: 200, description: '紅磚', category: '建材', unit: '塊', isFrequent: true },
  { itemName: '玻璃', price: 300, description: '建築玻璃', category: '建材', unit: '平方米', isFrequent: true },
  { itemName: '木材', price: 600, description: '建築木材', category: '建材', unit: '立方米', isFrequent: true },
  { itemName: '油漆', price: 150, description: '內牆油漆', category: '建材', unit: '桶', isFrequent: true },
  { itemName: '電線', price: 100, description: '電力線材', category: '設備', unit: '米', isFrequent: true },
  { itemName: '管道', price: 250, description: '水管', category: '設備', unit: '米', isFrequent: true },
];

async function createProjectItems() {
  try {
    console.log('🚀 Creating ProjectItems via API...');
    
    // 需要先登錄獲取token
    // 這裡假設您有有效的認證token
    const baseURL = 'http://localhost:8888/api';
    
    for (const item of mockProjectItems) {
      try {
        console.log(`📝 Creating: ${item.itemName}`);
        
        const response = await axios.post(`${baseURL}/projectitem/create`, item, {
          headers: {
            'Content-Type': 'application/json',
            // 注意：這裡需要有效的認證token
            // 'x-auth-token': 'your-auth-token'
          }
        });
        
        if (response.data.success) {
          console.log(`✅ Created: ${item.itemName}`);
        } else {
          console.log(`❌ Failed to create ${item.itemName}:`, response.data.message);
        }
      } catch (error) {
        console.log(`❌ Error creating ${item.itemName}:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('🎉 ProjectItem creation completed');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// 執行創建
if (require.main === module) {
  createProjectItems();
}

module.exports = createProjectItems;


