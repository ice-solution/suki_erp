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

async function debugLogin() {
    try {
        const phone = '98765432';
        
        console.log('🔍 測試登入查詢...');
        console.log('查詢條件:', {
            phone,
            removed: false,
            enabled: true,
            isActive: true
        });
        
        const employee = await ContractorEmployee.findOne({
            phone,
            removed: false,
            enabled: true,
            isActive: true
        }).populate('contractor');
        
        if (employee) {
            console.log('✅ 登入查詢成功!');
            console.log('員工信息:');
            console.log('ID:', employee._id);
            console.log('姓名:', employee.name);
            console.log('手機:', employee.phone);
            console.log('承包商:', employee.contractor?.name);
            console.log('isActive:', employee.isActive);
            console.log('removed:', employee.removed);
            console.log('enabled:', employee.enabled);
        } else {
            console.log('❌ 登入查詢失敗');
            
            // 逐步測試查詢條件
            console.log('\n🔍 測試各個查詢條件...');
            
            const byPhone = await ContractorEmployee.findOne({ phone });
            console.log('只用手機號碼查詢:', byPhone ? '找到' : '未找到');
            
            if (byPhone) {
                console.log('該員工詳細信息:');
                console.log('- removed:', byPhone.removed);
                console.log('- enabled:', byPhone.enabled);
                console.log('- isActive:', byPhone.isActive);
            }
            
            const byPhoneNotRemoved = await ContractorEmployee.findOne({
                phone,
                removed: false
            });
            console.log('手機號碼 + 未刪除:', byPhoneNotRemoved ? '找到' : '未找到');
            
            const byPhoneEnabled = await ContractorEmployee.findOne({
                phone,
                removed: false,
                enabled: true
            });
            console.log('手機號碼 + 未刪除 + 啟用:', byPhoneEnabled ? '找到' : '未找到');
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

debugLogin();
