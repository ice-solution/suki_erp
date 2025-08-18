const axios = require('axios');

const BASE_URL = 'http://localhost:8888/api';

// 測試承辦商API
async function testContractorAPI() {
  console.log('=== 測試承辦商API ===');
  
  try {
    // 測試新增承辦商
    const newContractor = {
      name: '測試承辦商',
      phone: '12345678',
      email: 'test@example.com',
      address: '測試地址',
      country: '香港'
    };
    
    const createRes = await axios.post(`${BASE_URL}/contractor`, newContractor);
    console.log('新增承辦商成功:', createRes.data);
    
    // 測試查詢所有承辦商
    const listRes = await axios.get(`${BASE_URL}/contractor`);
    console.log('承辦商列表:', listRes.data);
    
    // 測試查詢單一承辦商
    const getRes = await axios.get(`${BASE_URL}/contractor/${createRes.data._id}`);
    console.log('單一承辦商:', getRes.data);
    
    // 測試更新承辦商
    const updateRes = await axios.put(`${BASE_URL}/contractor/${createRes.data._id}`, {
      name: '更新後的承辦商'
    });
    console.log('更新承辦商成功:', updateRes.data);
    
    // 測試刪除承辦商
    const deleteRes = await axios.delete(`${BASE_URL}/contractor/${createRes.data._id}`);
    console.log('刪除承辦商成功:', deleteRes.data);
    
  } catch (error) {
    console.error('承辦商API測試失敗:', error.response?.data || error.message);
  }
}

// 測試承辦商員工API
async function testContractorEmployeeAPI() {
  console.log('\n=== 測試承辦商員工API ===');
  
  try {
    // 先建立一個承辦商
    const contractorRes = await axios.post(`${BASE_URL}/contractor`, {
      name: '測試承辦商',
      phone: '12345678'
    });
    
    // 測試新增員工
    const newEmployee = {
      name: '測試員工',
      contractor: contractorRes.data._id,
      position: '工程師',
      phone: '87654321',
      email: 'employee@example.com'
    };
    
    const createRes = await axios.post(`${BASE_URL}/contractor-employee`, newEmployee);
    console.log('新增員工成功:', createRes.data);
    
    // 測試查詢所有員工
    const listRes = await axios.get(`${BASE_URL}/contractor-employee`);
    console.log('員工列表:', listRes.data);
    
    // 測試根據承辦商查詢員工
    const contractorEmployeesRes = await axios.get(`${BASE_URL}/contractor-employee/contractor/${contractorRes.data._id}`);
    console.log('承辦商員工:', contractorEmployeesRes.data);
    
    // 清理
    await axios.delete(`${BASE_URL}/contractor-employee/${createRes.data._id}`);
    await axios.delete(`${BASE_URL}/contractor/${contractorRes.data._id}`);
    
  } catch (error) {
    console.error('承辦商員工API測試失敗:', error.response?.data || error.message);
  }
}

// 測試Project API
async function testProjectAPI() {
  console.log('\n=== 測試Project API ===');
  
  try {
    // 先建立承辦商和工程項目
    const contractorRes = await axios.post(`${BASE_URL}/contractor`, {
      name: '測試承辦商'
    });
    
    const projectItemRes = await axios.post(`${BASE_URL}/project-item`, {
      item_name: '測試項目',
      price: 1000
    });
    
    // 測試新增Project
    const newProject = {
      orderNumber: 'PO-001',
      type: '一般',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天後
      cost: 50000,
      contractor: contractorRes.data._id,
      contractorCost: 30000,
      status: 'pending',
      poNumber: 'PO-001',
      actualCost: 0,
      projectItems: [projectItemRes.data._id]
    };
    
    const createRes = await axios.post(`${BASE_URL}/project`, newProject);
    console.log('新增Project成功:', createRes.data);
    
    // 測試查詢所有Project
    const listRes = await axios.get(`${BASE_URL}/project`);
    console.log('Project列表:', listRes.data);
    
    // 測試根據狀態查詢Project
    const statusRes = await axios.get(`${BASE_URL}/project/status/pending`);
    console.log('待處理Project:', statusRes.data);
    
    // 測試根據承辦商查詢Project
    const contractorProjectsRes = await axios.get(`${BASE_URL}/project/contractor/${contractorRes.data._id}`);
    console.log('承辦商Project:', contractorProjectsRes.data);
    
    // 清理
    await axios.delete(`${BASE_URL}/project/${createRes.data._id}`);
    await axios.delete(`${BASE_URL}/project-item/${projectItemRes.data._id}`);
    await axios.delete(`${BASE_URL}/contractor/${contractorRes.data._id}`);
    
  } catch (error) {
    console.error('Project API測試失敗:', error.response?.data || error.message);
  }
}

// 測試項目類型API
async function testProjectTypeAPI() {
  console.log('\n=== 測試項目類型API ===');
  
  try {
    // 測試查詢所有項目類型
    const listRes = await axios.get(`${BASE_URL}/projecttype/listAll`);
    console.log('項目類型列表:', listRes.data);
    
    // 測試新增項目類型
    const newType = {
      name: '測試類型',
      description: '這是一個測試項目類型',
      color: '#ff6b35',
      sortOrder: 10
    };
    
    const createRes = await axios.post(`${BASE_URL}/projecttype/create`, newType);
    console.log('新增項目類型成功:', createRes.data);
    
    // 測試查詢單一項目類型
    const getRes = await axios.get(`${BASE_URL}/projecttype/read/${createRes.data.result._id}`);
    console.log('單一項目類型:', getRes.data);
    
    // 測試更新項目類型
    const updateRes = await axios.patch(`${BASE_URL}/projecttype/update/${createRes.data.result._id}`, {
      name: '更新後的測試類型'
    });
    console.log('更新項目類型成功:', updateRes.data);
    
    // 測試刪除項目類型
    const deleteRes = await axios.delete(`${BASE_URL}/projecttype/delete/${createRes.data.result._id}`);
    console.log('刪除項目類型成功:', deleteRes.data);
    
  } catch (error) {
    console.error('項目類型API測試失敗:', error.response?.data || error.message);
  }
}

// 執行所有測試
async function runAllTests() {
  await testContractorAPI();
  await testContractorEmployeeAPI();
  await testProjectAPI();
  await testProjectTypeAPI();
  console.log('\n=== 所有測試完成 ===');
}

runAllTests().catch(console.error); 