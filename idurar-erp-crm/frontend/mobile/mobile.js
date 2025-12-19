// 全局變量
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentProject = null;
let currentProjectInfo = null; // 保存當前項目信息（包括名稱）

// 初始化用戶數據
try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser && storedUser !== 'null') {
        currentUser = JSON.parse(storedUser);
    }
} catch (error) {
    console.error('Error parsing stored user data:', error);
    currentUser = null;
}

// API基礎URL
const API_BASE = '/api';

// 工具函數
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
    }
    console.log(`${type.toUpperCase()}: ${message}`);
}

// 顯示/隱藏 Loading Overlay
function showLoadingOverlay(text = '處理中...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay) {
        if (loadingText) loadingText.textContent = text;
        overlay.classList.add('active');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// 顯示成功消息 Overlay
function showSuccessOverlay(message, detail = '') {
    const overlay = document.getElementById('successOverlay');
    const successMessage = document.getElementById('successMessage');
    const successDetail = document.getElementById('successDetail');
    
    if (overlay) {
        if (successMessage) successMessage.textContent = message;
        if (successDetail) successDetail.textContent = detail;
        overlay.classList.add('active');
        
        // 2秒後自動關閉
        setTimeout(() => {
            hideSuccessOverlay();
        }, 2000);
    }
}

function hideSuccessOverlay() {
    const overlay = document.getElementById('successOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function formatDate(dateString) {
    if (!dateString) return '未設定';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW');
}

function formatProgress(progress) {
    return Math.round(progress || 0);
}

// 狀態文本轉換函數
function getStatusText(status) {
    const statusMap = {
        'pending': '待開始',
        'in_progress': '進行中',
        'completed': '已完成',
        'on_hold': '暫停',
        'cancelled': '已取消',
        'draft': '草稿',
        'active': '活躍',
        'inactive': '非活躍'
    };
    return statusMap[status] || status;
}

// API請求函數
async function apiRequest(url, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        console.log(`Making API request to: ${API_BASE}${url}`);
        const response = await fetch(`${API_BASE}${url}`, config);
        const data = await response.json();

        console.log(`API response:`, data);

        // 處理 401 未授權錯誤（token 過期或無效）
        if (response.status === 401) {
            console.warn('Token expired or invalid, logging out...');
            logout();
            showMessage('登入已過期，請重新登入', 'error');
            // 拋出特殊錯誤，讓調用者知道是認證錯誤
            const authError = new Error('登入已過期，請重新登入');
            authError.isAuthError = true;
            throw authError;
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        // 如果是認證錯誤，已經處理過登出，直接拋出
        if (error.isAuthError) {
            throw error;
        }
        // 其他錯誤正常拋出
        throw error;
    }
}

// 認證相關函數
async function login(credentials) {
    try {
        // 支持兩種登入方式：
        // 1. username + password（優先）
        // 2. phone（向後兼容）
        let loginData = {};
        if (credentials.username && credentials.password) {
            loginData = {
                username: credentials.username,
                password: credentials.password
            };
            console.log('Starting login process with username:', credentials.username);
        } else if (credentials.phone) {
            loginData = { phone: credentials.phone };
            console.log('Starting login process with phone:', credentials.phone);
        } else {
            throw new Error('請輸入用戶名和密碼，或手機號碼');
        }

        // 登入時不需要 token，所以使用特殊的請求函數
        const response = await fetch(`${API_BASE}/mobile-auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();
        console.log('Login response:', data);

        if (!response.ok) {
            throw new Error(data.message || '登入失敗');
        }

        if (data.success) {
            authToken = data.result.token;
            currentUser = data.result.contractor;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            console.log('Login successful, showing main section');
            showMessage('登入成功！', 'success');
            showMainSection();
            loadProjects();
        } else {
            throw new Error(data.message || '登入失敗');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('登入失敗: ' + error.message);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    showLoginSection();
}

// 界面控制函數
function showLoginSection() {
    document.getElementById('loginSection').classList.add('active');
    document.getElementById('mainSection').classList.remove('active');
    
    document.getElementById('headerTitle').textContent = '承辦商工程管理系統';
    document.getElementById('headerSubtitle').textContent = '請登入';
    document.getElementById('backBtn').style.display = 'none';
}

function showMainSection() {
    console.log('showMainSection called, currentUser:', currentUser);
    
    const loginSection = document.getElementById('loginSection');
    const mainSection = document.getElementById('mainSection');
    
    if (loginSection) {
        loginSection.classList.remove('active');
        console.log('Login section hidden');
    } else {
        console.error('Login section not found!');
    }
    
    if (mainSection) {
        mainSection.classList.add('active');
        console.log('Main section shown');
    } else {
        console.error('Main section not found!');
    }
    
    showPage('projects');
}

function showPage(pageName) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 顯示選中的頁面
    switch (pageName) {
        case 'projects':
            document.getElementById('projectsPage').classList.add('active');
            document.getElementById('headerTitle').textContent = '我的項目';
            document.getElementById('headerSubtitle').textContent = '查看分配的項目';
            document.getElementById('backBtn').style.display = 'none';
            loadProjects();
            break;
        case 'employees':
            document.getElementById('employeesPage').classList.add('active');
            document.getElementById('headerTitle').textContent = currentProjectInfo?.name || '員工列表';
            document.getElementById('headerSubtitle').textContent = '管理員工打咭';
            document.getElementById('backBtn').style.display = 'block';
            loadEmployees();
            break;
        case 'batchCheckIn':
            document.getElementById('batchCheckInPage').classList.add('active');
            document.getElementById('headerTitle').textContent = currentProjectInfo?.name || '今天打咭';
            document.getElementById('headerSubtitle').textContent = '選擇員工進行打咭';
            document.getElementById('backBtn').style.display = 'block';
            selectedEmployeesForCheckIn = []; // 清空選擇
            loadEmployeesForBatchCheckIn();
            break;
        case 'makeupCheckIn':
            document.getElementById('makeupCheckInPage').classList.add('active');
            document.getElementById('headerTitle').textContent = currentProjectInfo?.name || '補打咭';
            document.getElementById('headerSubtitle').textContent = '選擇日期和員工進行補打咭';
            document.getElementById('backBtn').style.display = 'block';
            // 設置日期限制：只允許今天往前7天（包括今天）
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
            
            const makeupDateInput = document.getElementById('makeupDate');
            if (makeupDateInput) {
                // 設置日期範圍限制
                makeupDateInput.setAttribute('max', todayStr);
                makeupDateInput.setAttribute('min', minDateStr);
                // 設置默認日期為今天
                makeupDateInput.value = todayStr;
                selectedEmployeesForMakeup = []; // 清空選擇
                loadEmployeesForMakeupCheckIn(todayStr);
            }
            break;
    }
}

function goBack() {
    if (document.getElementById('batchCheckInPage').classList.contains('active') ||
        document.getElementById('makeupCheckInPage').classList.contains('active')) {
        showPage('employees');
    } else if (document.getElementById('employeesPage').classList.contains('active')) {
        showPage('projects');
    } else {
        showPage('projects');
    }
}

// 數據加載函數
async function loadProjects() {
    try {
        console.log('Loading contractor projects...');
        console.log('Current user:', currentUser);
        console.log('Auth token:', authToken ? 'present' : 'missing');
        
        const response = await apiRequest('/mobile-project/contractor-projects');
        console.log('Projects API response:', response);
        
        if (response.success) {
            console.log('Projects loaded successfully:', response.result.projects);
            displayProjects(response.result.projects);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
        // 如果是認證錯誤，已經在 apiRequest 中處理了登出，這裡只顯示消息
        if (!error.isAuthError) {
            showMessage('加載項目失敗: ' + error.message);
            displayProjects([]);
        }
    }
}

function displayProjects(projects) {
    const projectsList = document.getElementById('projectsList');
    
    if (!projectsList) {
        console.error('projectsList element not found');
        return;
    }
    
    if (!projects || projects.length === 0) {
        projectsList.innerHTML = `
            <div class="loading">
                <p>暫無項目</p>
            </div>
        `;
        return;
    }
    
    projectsList.innerHTML = projects.map(project => `
        <div class="project-card" onclick="showProjectEmployees('${project._id}', '${project.name || '未命名項目'}')">
            <div class="project-title">${project.name || '未命名項目'}</div>
            <div class="project-info">P.O Number: ${project.poNumber || '未設定'}</div>
            <div class="project-info">Invoice Number: ${project.invoiceNumber || '未設定'}</div>
            <div class="project-info">描述：${project.description || '未設定'}</div>
            <div class="project-info">開始日期：${formatDate(project.startDate)}</div>
            <div class="project-info">
                <span class="status-badge status-${project.status}">${getStatusText(project.status)}</span>
            </div>
        </div>
    `).join('');
}

async function showProjectEmployees(projectId, projectName) {
    currentProject = projectId;
    
    // 保存項目信息
    if (projectName) {
        currentProjectInfo = { name: projectName };
    } else {
        // 如果沒有傳入項目名稱，從項目列表中獲取
        try {
            const projectsResponse = await apiRequest('/mobile-project/contractor-projects');
            if (projectsResponse.success) {
                const project = projectsResponse.result.projects.find(p => p._id === projectId);
                if (project) {
                    currentProjectInfo = { name: project.name };
                }
            }
        } catch (error) {
            console.error('Failed to load project info:', error);
        }
    }
    
    showPage('employees');
    loadEmployees();
}

// 加載項目員工列表（不再需要，因為直接進入打咭頁面）
async function loadEmployees() {
    // 不再顯示員工列表，直接提供打咭選項
}

// 批量打咭相關變量
let selectedEmployeesForCheckIn = [];

// 顯示批量打咭頁面
function showBatchCheckIn() {
    selectedEmployeesForCheckIn = [];
    showPage('batchCheckIn');
}

// 加載員工列表用於今天打咭
async function loadEmployeesForBatchCheckIn() {
    if (!currentProject) {
        showMessage('請先選擇一個項目');
        return;
    }

    try {
        // 使用 attendance-by-date API 獲取今天的員工列表和打咭狀態
        const today = new Date().toISOString().split('T')[0];
        const response = await apiRequest(`/mobile-project/project/${currentProject}/attendance-by-date?date=${today}`);
        if (response.success) {
            // 保存項目信息（如果還沒有）
            if (response.result.project && !currentProjectInfo) {
                currentProjectInfo = response.result.project;
            }
            displayEmployeesForBatchCheckIn(response.result.employees);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Failed to load employees for batch check-in:', error);
        if (!error.isAuthError) {
            showMessage('加載員工列表失敗: ' + error.message);
        }
    }
}

function displayEmployeesForBatchCheckIn(employees) {
    const employeesList = document.getElementById('batchCheckInEmployeesList');
    
    if (!employeesList) return;
    
    if (!employees || employees.length === 0) {
        employeesList.innerHTML = '<div class="loading"><p>此項目暫無分配的員工</p></div>';
        return;
    }
    
    // 顯示員工列表：已打咭的顯示 tick，未打咭的顯示 checkbox
    employeesList.innerHTML = employees.map(employee => `
        <div class="employee-card" style="justify-content: space-between; align-items: center;">
            <div class="employee-name" style="margin: 0;">${employee.name || '未命名'}</div>
            ${employee.hasCheckedIn ? 
                '<span class="check-icon">✓</span>' : 
                `<input type="checkbox" class="employee-checkbox" value="${employee._id}" 
                        onchange="toggleEmployeeSelection('${employee._id}', this.checked)">`
            }
        </div>
    `).join('');
}

function toggleEmployeeSelection(employeeId, checked) {
    if (checked) {
        if (!selectedEmployeesForCheckIn.includes(employeeId)) {
            selectedEmployeesForCheckIn.push(employeeId);
        }
    } else {
        selectedEmployeesForCheckIn = selectedEmployeesForCheckIn.filter(id => id !== employeeId);
    }
    console.log('Selected employees:', selectedEmployeesForCheckIn);
}

// 提交今天打咭
async function submitBatchCheckIn() {
    try {
        if (selectedEmployeesForCheckIn.length === 0) {
            showMessage('請至少選擇一個員工', 'error');
            return;
        }

        // 顯示 loading overlay
        showLoadingOverlay('正在提交打咭記錄...');

        const checkInDate = new Date().toISOString().split('T')[0]; // 今天的日期

        const response = await apiRequest(`/mobile-project/project/${currentProject}/batch-checkin`, {
            method: 'POST',
            body: JSON.stringify({
                employeeIds: selectedEmployeesForCheckIn,
                checkInDate
            })
        });

        // 隱藏 loading overlay
        hideLoadingOverlay();

        if (response.success) {
            // 顯示成功消息
            showSuccessOverlay(
                '打咭成功！',
                `已為 ${response.result.successCount} 個員工記錄打咭`
            );
            
            // 清空選擇
            selectedEmployeesForCheckIn = [];
            
            // 重新加載員工列表以更新打咭狀態
            setTimeout(() => {
                loadEmployeesForBatchCheckIn();
            }, 2000);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        // 隱藏 loading overlay
        hideLoadingOverlay();
        
        console.error('打咭失敗:', error);
        if (!error.isAuthError) {
            showMessage('打咭失敗: ' + error.message);
        }
    }
}

// 顯示補打咭頁面
function showMakeupCheckIn() {
    showPage('makeupCheckIn');
}

// 加載補打咭員工列表（根據日期）
async function loadEmployeesForMakeupCheckIn(date) {
    if (!currentProject || !date) {
        return;
    }

    try {
        // 使用 attendance-by-date API 獲取員工列表和打咭狀態
        const response = await apiRequest(`/mobile-project/project/${currentProject}/attendance-by-date?date=${date}`);
        if (response.success) {
            // 保存項目信息（如果還沒有）
            if (response.result.project && !currentProjectInfo) {
                currentProjectInfo = response.result.project;
            }
            displayEmployeesForMakeupCheckIn(response.result.employees);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Failed to load employees for makeup check-in:', error);
        if (!error.isAuthError) {
            showMessage('加載員工列表失敗: ' + error.message);
        }
    }
}

function displayEmployeesForMakeupCheckIn(employees) {
    const employeesList = document.getElementById('makeupEmployeesList');
    
    if (!employeesList) return;
    
    if (!employees || employees.length === 0) {
        employeesList.innerHTML = '<div class="loading"><p>此項目暫無分配的員工</p></div>';
        return;
    }
    
    // 顯示員工列表：已打咭的顯示 tick，未打咭的顯示 checkbox
    employeesList.innerHTML = employees.map(employee => `
        <div class="employee-card" style="justify-content: space-between; align-items: center;">
            <div class="employee-name" style="margin: 0;">${employee.name || '未命名'}</div>
            ${employee.hasCheckedIn ? 
                '<span class="check-icon">✓</span>' : 
                `<input type="checkbox" class="employee-checkbox" value="${employee._id}" 
                        onchange="toggleMakeupEmployeeSelection('${employee._id}', this.checked)">`
            }
        </div>
    `).join('');
}

let selectedEmployeesForMakeup = [];

function toggleMakeupEmployeeSelection(employeeId, checked) {
    if (checked) {
        if (!selectedEmployeesForMakeup.includes(employeeId)) {
            selectedEmployeesForMakeup.push(employeeId);
        }
    } else {
        selectedEmployeesForMakeup = selectedEmployeesForMakeup.filter(id => id !== employeeId);
    }
    console.log('Selected employees for makeup:', selectedEmployeesForMakeup);
}

// 提交補打咭
async function submitMakeupCheckIn() {
    try {
        if (selectedEmployeesForMakeup.length === 0) {
            showMessage('請至少選擇一個員工', 'error');
            return;
        }

        const checkInDate = document.getElementById('makeupDate').value;
        if (!checkInDate) {
            showMessage('請選擇日期', 'error');
            return;
        }

        // 驗證日期範圍：只允許今天往前7天（包括今天）
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const minDateStr = sevenDaysAgo.toISOString().split('T')[0];

        if (checkInDate > todayStr) {
            showMessage('不能選擇未來的日期', 'error');
            return;
        }

        if (checkInDate < minDateStr) {
            showMessage('只能選擇今天往前7天內的日期', 'error');
            return;
        }

        // 顯示 loading overlay
        showLoadingOverlay('正在提交補打咭記錄...');

        const response = await apiRequest(`/mobile-project/project/${currentProject}/makeup-checkin`, {
            method: 'POST',
            body: JSON.stringify({
                employeeIds: selectedEmployeesForMakeup,
                checkInDate
            })
        });

        // 隱藏 loading overlay
        hideLoadingOverlay();

        if (response.success) {
            // 顯示成功消息
            showSuccessOverlay(
                '補打咭成功！',
                `已為 ${response.result.successCount} 個員工記錄補打咭`
            );
            
            // 清空選擇
            selectedEmployeesForMakeup = [];
            
            // 重新加載員工列表以更新打咭狀態
            setTimeout(() => {
                const date = document.getElementById('makeupDate').value;
                loadEmployeesForMakeupCheckIn(date);
            }, 2000);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        // 隱藏 loading overlay
        hideLoadingOverlay();
        
        console.error('補打咭失敗:', error);
        if (!error.isAuthError) {
            showMessage('補打咭失敗: ' + error.message);
        }
    }
}

// 事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authentication...');
    
    // 添加全局錯誤處理
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
    });
    
    // 處理URL參數
    const urlParams = new URLSearchParams(window.location.search);
    const phoneParam = urlParams.get('phone');
    if (phoneParam) {
        console.log('Phone parameter found in URL:', phoneParam);
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.value = phoneParam;
        }
    }
    
    // 檢查是否已登入
    if (authToken && currentUser) {
        console.log('User already logged in, showing main section');
        showMainSection();
    } else {
        console.log('No authentication found, showing login section');
        showLoginSection();
    }
    
    // 登入表單處理
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, adding event listener');
        
        loginForm.addEventListener('submit', function(e) {
            console.log('Form submit event triggered');
            e.preventDefault();
            e.stopPropagation();
            
            const username = document.getElementById('username')?.value.trim();
            const password = document.getElementById('password')?.value;
            const phone = document.getElementById('phone')?.value.trim();
            
            // 優先使用 username + password
            if (username && password) {
                console.log('Attempting login with username:', username);
                login({ username, password });
            } else if (phone) {
                // 向後兼容：使用手機號碼登入
                console.log('Attempting login with phone:', phone);
                login({ phone });
            } else {
                console.log('No credentials provided');
                showMessage('請輸入用戶名和密碼，或手機號碼');
            }
            
            return false;
        });
    } else {
        console.error('Login form not found!');
    }
    
    // 批量打咭表單
    const batchCheckInForm = document.getElementById('batchCheckInForm');
    if (batchCheckInForm) {
        batchCheckInForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBatchCheckIn();
        });
    }
    
    // 補打咭表單
    const makeupCheckInForm = document.getElementById('makeupCheckInForm');
    if (makeupCheckInForm) {
        makeupCheckInForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitMakeupCheckIn();
        });
    }
    
    // 補打咭日期選擇變化
    const makeupDateInput = document.getElementById('makeupDate');
    if (makeupDateInput) {
        // 初始化日期限制
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
        
        makeupDateInput.setAttribute('max', todayStr);
        makeupDateInput.setAttribute('min', minDateStr);
        
        makeupDateInput.addEventListener('change', function(e) {
            let selectedDate = e.target.value;
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
            
            // 驗證日期範圍
            if (selectedDate > todayStr) {
                showMessage('不能選擇未來的日期', 'error');
                e.target.value = todayStr;
                selectedDate = todayStr;
            } else if (selectedDate < minDateStr) {
                showMessage('只能選擇今天往前7天內的日期', 'error');
                e.target.value = minDateStr;
                selectedDate = minDateStr;
            }
            
            selectedEmployeesForMakeup = []; // 清空選擇
            loadEmployeesForMakeupCheckIn(selectedDate);
        });
    }
    
    // 返回按鈕
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
});

// 全局函數供HTML調用
window.showPage = showPage;
window.showProjectEmployees = showProjectEmployees;
window.showBatchCheckIn = showBatchCheckIn;
window.showMakeupCheckIn = showMakeupCheckIn;
window.toggleEmployeeSelection = toggleEmployeeSelection;
window.toggleMakeupEmployeeSelection = toggleMakeupEmployeeSelection;
window.goBack = goBack;
window.logout = logout;