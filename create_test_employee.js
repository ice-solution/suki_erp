const mongoose = require('mongoose');
require('module-alias/register');

// 連接到MongoDB
mongoose.connect(process.env.DATABASE || 'mongodb://127.0.0.1:27017/suki_erp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// 載入模型
require('./idurar-erp-crm/backend/src/models/appModels/Contractor');
require('./idurar-erp-crm/backend/src/models/appModels/ContractorEmployee');

const Contractor = mongoose.model('Contractor');
const ContractorEmployee = mongoose.model('ContractorEmployee');

async function createTestEmployee() {
    try {
        console.log('🔍 尋找或創建測試承包商...');
        
        let contractor = await Contractor.findOne({ name: '測試承包商' });
        if (!contractor) {
            contractor = new Contractor({
                name: '測試承包商',
                phone: '12345678',
                email: 'test@contractor.com',
                address: '測試地址',
                removed: false,
                enabled: true
            });
            await contractor.save();
            console.log('✅ 創建測試承包商成功');
        } else {
            console.log('✅ 找到現有測試承包商');
        }

        console.log('🔍 尋找或創建測試員工...');
        
        let employee = await ContractorEmployee.findOne({ phone: '98765432' });
        if (!employee) {
            employee = new ContractorEmployee({
                name: '測試員工',
                contractor: contractor._id,
                phone: '98765432',
                email: 'test@employee.com',
                position: '工程師',
                isActive: true,
                removed: false,
                enabled: true
            });
            await employee.save();
            console.log('✅ 創建測試員工成功');
        } else {
            console.log('✅ 找到現有測試員工');
        }

        console.log('\n📋 測試員工信息:');
        console.log('姓名:', employee.name);
        console.log('手機:', employee.phone);
        console.log('承包商:', contractor.name);
        console.log('狀態:', employee.isActive ? '啟用' : '停用');
        
        await mongoose.connection.close();
        console.log('\n✅ 完成！現在可以用手機號碼 98765432 測試登入了');
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

createTestEmployee();
