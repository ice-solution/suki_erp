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

async function checkEmployee() {
    try {
        console.log('🔍 查找手機號碼為 98765432 的員工...');
        
        const employee = await ContractorEmployee.findOne({ phone: '98765432' })
            .populate('contractor');
        
        if (employee) {
            console.log('✅ 找到員工:');
            console.log('ID:', employee._id);
            console.log('姓名:', employee.name);
            console.log('手機:', employee.phone);
            console.log('承包商:', employee.contractor?.name || '未填充');
            console.log('isActive:', employee.isActive);
            console.log('removed:', employee.removed);
            console.log('enabled:', employee.enabled);
            
            // 測試登入查詢條件
            console.log('\n🔍 測試登入查詢條件:');
            const loginQuery = await ContractorEmployee.findOne({
                phone: '98765432',
                removed: false,
                enabled: true,
                isActive: true
            });
            console.log('登入查詢結果:', loginQuery ? '找到' : '未找到');
        } else {
            console.log('❌ 未找到員工');
        }
        
        // 查看所有員工
        console.log('\n📋 所有員工:');
        const allEmployees = await ContractorEmployee.find({});
        allEmployees.forEach(emp => {
            console.log(`- ${emp.name} (${emp.phone}) - removed: ${emp.removed}, isActive: ${emp.isActive}`);
        });
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

checkEmployee();
