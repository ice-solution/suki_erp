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

async function checkRealEmployees() {
    try {
        console.log('🔍 檢查現有的 contractor-employee 數據...');
        
        const allEmployees = await ContractorEmployee.find({})
            .populate('contractor');
        
        console.log(`找到 ${allEmployees.length} 個員工記錄:`);
        
        allEmployees.forEach((emp, index) => {
            console.log(`\n${index + 1}. ${emp.name}`);
            console.log(`   手機: ${emp.phone}`);
            console.log(`   Email: ${emp.email || '未填寫'}`);
            console.log(`   職位: ${emp.position || '未填寫'}`);
            console.log(`   承包商: ${emp.contractor?.name || '未填充'}`);
            console.log(`   removed: ${emp.removed}`);
            console.log(`   enabled: ${emp.enabled}`);
            console.log(`   isActive: ${emp.isActive}`);
        });
        
        // 特別檢查有手機號碼的員工
        console.log('\n📱 有手機號碼的員工:');
        const employeesWithPhone = allEmployees.filter(emp => emp.phone);
        employeesWithPhone.forEach(emp => {
            console.log(`- ${emp.name}: ${emp.phone} (enabled: ${emp.enabled}, isActive: ${emp.isActive})`);
        });
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

checkRealEmployees();
