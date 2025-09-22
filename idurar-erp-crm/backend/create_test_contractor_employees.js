const mongoose = require('mongoose');

// 連接到MongoDB
mongoose.connect('mongodb://localhost:27017/idurar-erp-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 定義Contractor Schema
const contractorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
  country: String,
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

// 定義ContractorEmployee Schema
const contractorEmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contractor: { type: mongoose.Schema.ObjectId, ref: 'Contractor', required: true },
  phone: { type: String, required: true, unique: true },
  email: String,
  position: String,
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

const Contractor = mongoose.model('Contractor', contractorSchema);
const ContractorEmployee = mongoose.model('ContractorEmployee', contractorEmployeeSchema);

async function createTestData() {
  try {
    console.log('🚀 開始創建測試數據...');
    
    // 創建承辦商
    const contractors = await Contractor.insertMany([
      {
        name: '富國工程',
        phone: '55566666',
        email: 'abc@abc.com',
        address: '香港中環',
        country: 'HK'
      },
      {
        name: '吳偉洪工程',
        phone: '98765432',
        email: 'wu@example.com',
        address: '香港九龍',
        country: 'HK'
      },
      {
        name: '李祖根建築',
        phone: '12345678',
        email: 'li@example.com',
        address: '香港新界',
        country: 'HK'
      }
    ]);
    
    console.log('✅ 創建承辦商成功:', contractors.length, '個');
    
    // 創建承辦商員工
    const employees = await ContractorEmployee.insertMany([
      {
        name: '張三',
        contractor: contractors[0]._id,
        phone: '98765432',
        email: 'zhang@example.com',
        position: '工程師',
        enabled: true,
        removed: false,
        isActive: true
      },
      {
        name: '李四',
        contractor: contractors[0]._id,
        phone: '87654321',
        email: 'li@example.com',
        position: '技工',
        enabled: true,
        removed: false,
        isActive: true
      },
      {
        name: '王五',
        contractor: contractors[1]._id,
        phone: '76543210',
        email: 'wang@example.com',
        position: '主管',
        enabled: true,
        removed: false,
        isActive: true
      },
      {
        name: '趙六',
        contractor: contractors[2]._id,
        phone: '65432109',
        email: 'zhao@example.com',
        position: '技工',
        enabled: true,
        removed: false,
        isActive: true
      }
    ]);
    
    console.log('✅ 創建承辦商員工成功:', employees.length, '個');
    
    // 顯示創建的數據
    console.log('\n📋 創建的承辦商:');
    contractors.forEach(contractor => {
      console.log(`- ${contractor.name} (${contractor.phone})`);
    });
    
    console.log('\n👥 創建的員工:');
    employees.forEach(employee => {
      console.log(`- ${employee.name} (${employee.phone}) - ${employee.position}`);
    });
    
    console.log('\n🎉 測試數據創建完成！');
    console.log('\n📱 可以用以下手機號碼測試mobile登入:');
    employees.forEach(employee => {
      console.log(`- ${employee.phone} (${employee.name})`);
    });
    
  } catch (error) {
    console.error('❌ 創建測試數據失敗:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestData();
