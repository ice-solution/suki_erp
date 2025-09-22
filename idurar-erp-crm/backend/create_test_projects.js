const mongoose = require('mongoose');

// 連接到MongoDB
mongoose.connect('mongodb://localhost:27017/idurar-erp-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 定義Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  poNumber: { type: String, required: true },
  description: String,
  address: String,
  startDate: Date,
  endDate: Date,
  status: { type: String, default: 'active' },
  contractors: [{ type: mongoose.Schema.ObjectId, ref: 'Contractor' }],
  clients: [{ type: mongoose.Schema.ObjectId, ref: 'Client' }],
  removed: { type: Boolean, default: false },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

// 定義WorkProgress Schema
const workProgressSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.ObjectId, ref: 'Project', required: true },
  contractorEmployee: { type: mongoose.Schema.ObjectId, ref: 'ContractorEmployee', required: true },
  item: {
    itemName: { type: String, required: true },
    description: String,
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    sourceQuote: String,
    sourceQuoteId: mongoose.Schema.ObjectId
  },
  progress: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  completionDate: { type: Date, required: true },
  days: Number,
  history: [{
    date: { type: Date, default: Date.now },
    percentage: { type: Number, required: true },
    description: String,
    images: [String],
    recordedBy: { type: mongoose.Schema.ObjectId, ref: 'ContractorEmployee' }
  }],
  notes: String,
  removed: { type: Boolean, default: false },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);
const WorkProgress = mongoose.model('WorkProgress', workProgressSchema);
const Contractor = mongoose.model('Contractor', new mongoose.Schema({}, { strict: false }));
const ContractorEmployee = mongoose.model('ContractorEmployee', new mongoose.Schema({}, { strict: false }));

async function createTestProjects() {
  try {
    console.log('🚀 開始創建測試項目數據...');
    
    // 獲取現有的contractors和employees
    const contractors = await Contractor.find({ removed: false });
    const employees = await ContractorEmployee.find({ removed: false });
    
    console.log('📋 找到承辦商:', contractors.length, '個');
    console.log('👥 找到員工:', employees.length, '個');
    
    if (contractors.length === 0 || employees.length === 0) {
      console.log('❌ 沒有找到承辦商或員工數據，請先運行 create_test_contractor_employees.js');
      return;
    }
    
    // 創建測試項目
    const projects = await Project.insertMany([
      {
        name: '中環大廈翻新工程',
        poNumber: 'PO-2024-001',
        description: '中環商業大廈全面翻新工程',
        address: '香港中環',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        status: 'active',
        contractors: [contractors[0]._id, contractors[1]._id]
      },
      {
        name: '九龍住宅建設',
        poNumber: 'PO-2024-002',
        description: '九龍新住宅區建設項目',
        address: '香港九龍',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-31'),
        status: 'active',
        contractors: [contractors[1]._id, contractors[2]._id]
      },
      {
        name: '新界基礎設施',
        poNumber: 'PO-2024-003',
        description: '新界地區基礎設施建設',
        address: '香港新界',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-12-31'),
        status: 'active',
        contractors: [contractors[0]._id, contractors[2]._id]
      }
    ]);
    
    console.log('✅ 創建項目成功:', projects.length, '個');
    
    // 為每個項目創建WorkProgress
    const workProgresses = [];
    
    for (const project of projects) {
      // 為每個項目創建3-4個WorkProgress
      const projectWorkProgresses = [
        {
          project: project._id,
          contractorEmployee: employees[0]._id,
          item: {
            itemName: '水泥工程',
            description: '基礎水泥澆灌',
            quantity: 10,
            price: 500,
            total: 5000,
            sourceQuote: 'QU-001'
          },
          progress: 30,
          status: 'in_progress',
          completionDate: new Date('2024-04-30'),
          history: [{
            date: new Date('2024-01-15'),
            percentage: 30,
            description: '完成基礎水泥澆灌30%',
            recordedBy: employees[0]._id
          }]
        },
        {
          project: project._id,
          contractorEmployee: employees[1]._id,
          item: {
            itemName: '鋼筋工程',
            description: '鋼筋結構安裝',
            quantity: 5,
            price: 800,
            total: 4000,
            sourceQuote: 'QU-002'
          },
          progress: 60,
          status: 'in_progress',
          completionDate: new Date('2024-05-15'),
          history: [{
            date: new Date('2024-01-20'),
            percentage: 60,
            description: '鋼筋結構安裝完成60%',
            recordedBy: employees[1]._id
          }]
        },
        {
          project: project._id,
          contractorEmployee: employees[2]._id,
          item: {
            itemName: '電氣工程',
            description: '電氣系統安裝',
            quantity: 8,
            price: 1200,
            total: 9600,
            sourceQuote: 'QU-003'
          },
          progress: 10,
          status: 'pending',
          completionDate: new Date('2024-06-30'),
          history: []
        }
      ];
      
      workProgresses.push(...projectWorkProgresses);
    }
    
    const createdWorkProgresses = await WorkProgress.insertMany(workProgresses);
    console.log('✅ 創建WorkProgress成功:', createdWorkProgresses.length, '個');
    
    // 顯示創建的數據
    console.log('\n📋 創建的項目:');
    projects.forEach(project => {
      console.log(`- ${project.name} (${project.poNumber}) - 承辦商: ${project.contractors.length}個`);
    });
    
    console.log('\n🎉 測試項目數據創建完成！');
    console.log('\n📱 現在可以用以下手機號碼測試mobile登入:');
    employees.forEach(employee => {
      console.log(`- ${employee.phone} (${employee.name})`);
    });
    
  } catch (error) {
    console.error('❌ 創建測試項目數據失敗:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestProjects();
