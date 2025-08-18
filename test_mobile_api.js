const axios = require('axios');

const API_BASE = 'http://localhost:8888/api';

async function testMobileLogin() {
    console.log('🧪 測試手機端登入API...');
    
    try {
        // 測試登入API
        const response = await axios.post(`${API_BASE}/mobile-auth/login`, {
            phone: '98765432'
        });
        
        console.log('✅ 登入成功!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        const token = response.data.result.token;
        
        // 測試獲取我的項目
        console.log('\n🧪 測試獲取我的項目...');
        const projectsResponse = await axios.get(`${API_BASE}/mobile-project/my-projects`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ 獲取項目成功!');
        console.log('Projects:', JSON.stringify(projectsResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ 測試失敗:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

// 運行測試
testMobileLogin();
