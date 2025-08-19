const mongoose = require('mongoose');
require('module-alias/register');

// 連接到MongoDB
mongoose.connect(process.env.DATABASE || 'mongodb://127.0.0.1:27017/suki_erp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// 載入模型
require('./src/models/appModels/Contractor');
require('./src/models/appModels/ContractorEmployee');

const ContractorEmployee = mongoose.model('ContractorEmployee');

async function findExistingEmployees() {
    try {
        console.log('🔍 尋找所有現有的員工記錄...');
        
        // 不過濾任何條件，查看所有記錄
        const allEmployees = await ContractorEmployee.find({})
            .populate('contractor');
        
        console.log(`總共找到 ${allEmployees.length} 個員工記錄:\n`);
        
        if (allEmployees.length === 0) {
            console.log('❌ 沒有找到任何員工記錄');
        } else {
            allEmployees.forEach((emp, index) => {
                console.log(`${index + 1}. 員工信息:`);
                console.log(`   ID: ${emp._id}`);
                console.log(`   姓名: ${emp.name}`);
                console.log(`   手機: ${emp.phone || '未填寫'}`);
                console.log(`   Email: ${emp.email || '未填寫'}`);
                console.log(`   職位: ${emp.position || '未填寫'}`);
                console.log(`   承包商: ${emp.contractor?.name || '未連結'}`);
                console.log(`   removed: ${emp.removed}`);
                console.log(`   enabled: ${emp.enabled}`);
                console.log(`   isActive: ${emp.isActive}`);
                console.log(`   創建時間: ${emp.createdAt}`);
                console.log('');
            });
            
            // 建議可以用來測試的手機號碼
            const employeesWithPhone = allEmployees.filter(emp => emp.phone && emp.enabled && emp.isActive && !emp.removed);
            if (employeesWithPhone.length > 0) {
                console.log('📱 可以用來測試登入的員工:');
                employeesWithPhone.forEach(emp => {
                    console.log(`   ${emp.name}: ${emp.phone}`);
                });
            }
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

findExistingEmployees();
