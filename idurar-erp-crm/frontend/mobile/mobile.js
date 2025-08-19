// 全局變量
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentProject = null;
let workProcesses = [];
let todayAttendance = null;

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

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// 認證相關函數
async function login(phone) {
    try {
        const response = await apiRequest('/mobile-auth/login', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });

        if (response.success) {
            authToken = response.result.token;
            currentUser = response.result.employee;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMainSection();
            loadProjects();
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        showMessage(error.message);
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
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('fab').classList.remove('show');
    
    document.getElementById('headerTitle').textContent = '員工工程管理系統';
    document.getElementById('headerSubtitle').textContent = '請輸入手機號碼登入';
    document.getElementById('backBtn').style.display = 'none';
}

function showMainSection() {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('mainSection').classList.add('active');
    document.getElementById('navbar').style.display = 'flex';
    document.getElementById('fab').classList.add('show');
    
    showPage('projects');
}

function showPage(pageName) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 移除所有導航項的active狀態
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 顯示選中的頁面
    switch (pageName) {
        case 'projects':
            document.getElementById('projectsPage').classList.add('active');
            document.querySelector('.nav-item[onclick="showPage(\'projects\')"]').classList.add('active');
            document.getElementById('headerTitle').textContent = '我的項目';
            document.getElementById('headerSubtitle').textContent = '查看分配的項目';
            document.getElementById('backBtn').style.display = 'none';
            document.getElementById('fab').classList.remove('show');
            loadProjects();
            break;
        case 'progress':
            document.getElementById('progressPage').classList.add('active');
            document.querySelector('.nav-item[onclick="showPage(\'progress\')"]').classList.add('active');
            document.getElementById('headerTitle').textContent = '進度記錄';
            document.getElementById('headerSubtitle').textContent = '記錄工作進度';
            document.getElementById('backBtn').style.display = 'none';
            document.getElementById('fab').classList.remove('show');
            loadWorkProcesses();
            break;
        case 'profile':
            document.getElementById('profilePage').classList.add('active');
            document.querySelector('.nav-item[onclick="showPage(\'profile\')"]').classList.add('active');
            document.getElementById('headerTitle').textContent = '個人資料';
            document.getElementById('headerSubtitle').textContent = '查看個人信息';
            document.getElementById('backBtn').style.display = 'none';
            document.getElementById('fab').classList.remove('show');
            loadProfile();
            break;
        case 'attendance':
            document.getElementById('attendancePage').classList.add('active');
            document.querySelector('.nav-item[onclick="showPage(\'attendance\')"]').classList.add('active');
            document.getElementById('headerTitle').textContent = '出席打卡';
            document.getElementById('headerSubtitle').textContent = '記錄今日出席';
            document.getElementById('backBtn').style.display = 'none';
            document.getElementById('fab').classList.remove('show');
            loadTodayAttendance();
            break;
    }
}

function goBack() {
    if (document.getElementById('projectDetailPage').classList.contains('active')) {
        showPage('projects');
    } else {
        showPage('projects');
    }
}

// 數據加載函數
async function loadProjects() {
    try {
        console.log('Loading projects...');
        const response = await apiRequest('/mobile-project/my-projects');
        
        if (response.success) {
            displayProjects(response.result.projects);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
        showMessage('加載項目失敗: ' + error.message);
        // 顯示錯誤狀態
        displayProjects([]);
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
        <div class="project-card">
            <div class="project-header" onclick="showProjectDetail('${project._id}')">
                <div class="project-title">${project.orderNumber || project.projectName || '未命名項目'}</div>
                <div class="project-info">客戶：${project.client?.name || '未設定'}</div>
                <div class="project-info">開始日期：${formatDate(project.startDate)}</div>
                <div class="project-info">
                    職位：${project.employeeRole?.position || '未設定'}
                    <span class="status-badge status-${project.status}">${getStatusText(project.status)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${formatProgress(project.progress)}%"></div>
                </div>
                <div style="font-size: 12px; color: #666; text-align: right;">
                    進度：${formatProgress(project.progress)}%
                </div>
            </div>
            <div class="project-actions">
                <button class="btn btn-small btn-success" onclick="selectProjectForAttendance('${project._id}')">
                    <i>✅</i> 出席打卡
                </button>
            </div>
        </div>
    `).join('');
}

async function loadProjectDetail(projectId) {
    try {
        console.log('Loading project detail for:', projectId);
        const response = await apiRequest(`/mobile-project/project/${projectId}`);
        
        if (response.success) {
            displayProjectDetail(response.result);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Failed to load project detail:', error);
        showMessage('加載項目詳情失敗: ' + error.message);
    }
}

function displayProjectDetail(projectData) {
    const projectDetailElement = document.getElementById('projectDetail');
    
    if (!projectDetailElement) {
        console.error('projectDetail element not found');
        return;
    }
    
    const { project, statistics, workProcesses, recentProgress } = projectData;
    
    projectDetailElement.innerHTML = `
        <div class="project-card">
            <div class="project-title">${project.orderNumber || project.projectName || '未命名項目'}</div>
            <div class="project-info">客戶：${project.client?.name || '未設定'}</div>
            <div class="project-info">承包商：${project.contractor?.name || '未設定'}</div>
            <div class="project-info">開始日期：${formatDate(project.startDate)}</div>
            <div class="project-info">結束日期：${formatDate(project.endDate)}</div>
            ${project.description ? `<div class="project-info">描述：${project.description}</div>` : ''}
            ${project.location ? `<div class="project-info">地點：${project.location}</div>` : ''}
        </div>
        
        <div class="project-card">
            <h3>項目統計</h3>
            <div class="project-info">總工序：${statistics?.totalProcesses || 0}</div>
            <div class="project-info">已完成：${statistics?.completedProcesses || 0}</div>
            <div class="project-info">平均進度：${statistics?.averageProgress || 0}%</div>
            ${statistics?.overdueProcesses > 0 ? `<div class="project-info" style="color: #dc3545;">超期工序：${statistics.overdueProcesses}</div>` : ''}
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${statistics?.averageProgress || 0}%"></div>
            </div>
        </div>
        
        <div class="project-card">
            <h3>工序列表</h3>
            ${workProcesses && workProcesses.length > 0 ? workProcesses.map(wp => `
                <div style="border-bottom: 1px solid #eee; padding: 8px 0;">
                    <div style="font-weight: 500;">${wp.name}</div>
                    <div class="project-info">序號：${wp.sequence} | 進度：${formatProgress(wp.progress)}%</div>
                    <div class="project-info">狀態：<span class="status-badge status-${wp.status}">${getStatusText(wp.status)}</span></div>
                    ${wp.isOverdue ? '<div style="color: #dc3545; font-size: 12px;">⚠️ 已超期</div>' : ''}
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${formatProgress(wp.progress)}%"></div>
                    </div>
                </div>
            `).join('') : '<p>暫無工序</p>'}
        </div>
        
        ${recentProgress && recentProgress.length > 0 ? `
        <div class="project-card">
            <h3>最近進度記錄</h3>
            ${recentProgress.slice(0, 5).map(rp => `
                <div style="border-bottom: 1px solid #eee; padding: 8px 0;">
                    <div style="font-weight: 500;">${rp.workProcess?.name || '未知工序'}</div>
                    <div class="project-info">${formatDate(rp.recordDate)} | ${rp.submittedBy?.employee?.name || '未知'}</div>
                    <div style="font-size: 14px; margin-top: 4px;">${rp.workDescription || ''}</div>
                    ${rp.progressIncrement > 0 ? `<div style="color: #2e7d32; font-size: 12px;">進度增量：+${rp.progressIncrement}%</div>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
    `;
}

function showProjectDetail(projectId) {
    currentProject = projectId;
    
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 顯示項目詳情頁
    document.getElementById('projectDetailPage').classList.add('active');
    
    // 更新header
    document.getElementById('headerTitle').textContent = '項目詳情';
    document.getElementById('headerSubtitle').textContent = '查看項目詳細信息';
    document.getElementById('backBtn').style.display = 'block';
    document.getElementById('fab').classList.remove('show');
    
    loadProjectDetail(projectId);
}

// 選擇項目進行考勤
function selectProjectForAttendance(projectId) {
    // 從項目列表中查找項目
    const projectCards = document.querySelectorAll('.project-card');
    let selectedProject = null;
    
    projectCards.forEach(card => {
        const button = card.querySelector(`button[onclick="selectProjectForAttendance('${projectId}')"]`);
        if (button) {
            // 從項目卡片中提取項目信息
            const title = card.querySelector('.project-title').textContent;
            const client = card.querySelector('.project-info').textContent.replace('客戶：', '');
            selectedProject = {
                _id: projectId,
                orderNumber: title,
                projectName: title,
                client: { name: client }
            };
        }
    });
    
    if (selectedProject) {
        currentProject = selectedProject;
        showPage('attendance');
    } else {
        showMessage('無法找到項目信息');
    }
}

async function loadWorkProcesses() {
    try {
        // 首先加載我的項目
        const projectsResponse = await apiRequest('/mobile-project/my-projects');
        
        if (projectsResponse.success) {
            const workProcessSelect = document.getElementById('workProcess');
            workProcessSelect.innerHTML = '<option value="">請選擇工序</option>';
            
            for (const project of projectsResponse.result.projects) {
                // 為每個項目加載工序
                try {
                    const processResponse = await apiRequest(`/mobile-project/project/${project._id}/work-processes?assignedToMe=true`);
                    
                    if (processResponse.success && processResponse.result.workProcesses.length > 0) {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = project.orderNumber || project.projectName || '未命名項目';
                        
                        processResponse.result.workProcesses.forEach(wp => {
                            if (wp.canRecord) {
                                const option = document.createElement('option');
                                option.value = wp._id;
                                option.textContent = `${wp.name} (${formatProgress(wp.progress)}%) - ${getStatusText(wp.status)}`;
                                option.dataset.projectId = project._id;
                                optgroup.appendChild(option);
                            }
                        });
                        
                        workProcessSelect.appendChild(optgroup);
                    }
                } catch (error) {
                    console.error(`Failed to load work processes for project ${project._id}:`, error);
                }
            }
        }
    } catch (error) {
        showMessage('加載工序失敗: ' + error.message);
    }
}

async function loadProfile() {
    try {
        const response = await apiRequest('/mobile-auth/profile');
        
        if (response.success) {
            const profileContent = document.getElementById('profileContent');
            const employee = response.result; // 直接使用 result，不是 result.employee
            
            profileContent.innerHTML = `
                <div class="profile-card">
                    <h3>個人資料</h3>
                    <div class="profile-info">
                        <p><strong>姓名:</strong> ${employee.name || '未設定'}</p>
                        <p><strong>手機:</strong> ${employee.phone || '未設定'}</p>
                        <p><strong>職位:</strong> ${employee.position || '未設定'}</p>
                        <p><strong>承辦商:</strong> ${employee.contractor?.name || '未設定'}</p>
                        <p><strong>最後登入:</strong> ${formatDate(employee.lastLogin)}</p>
                    </div>
                </div>
                
                <div class="profile-card">
                    <h3>統計信息</h3>
                    <div class="profile-info">
                        <p><strong>參與項目:</strong> 0</p>
                        <p><strong>完成工序:</strong> 0</p>
                        <p><strong>總工作時數:</strong> 0</p>
                    </div>
                </div>
                
                <button class="btn" onclick="logout()">登出</button>
            `;
        }
    } catch (error) {
        showMessage('加載個人資料失敗: ' + error.message);
    }
}

// 考勤相關函數
async function loadTodayAttendance() {
    try {
        if (!currentProject) {
            showMessage('請先選擇一個項目');
            return;
        }

        const response = await apiRequest(`/mobile-attendance/today?projectId=${currentProject._id}`);
        
        if (response.success) {
            todayAttendance = response.result;
            displayAttendanceStatus();
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        showMessage('加載考勤記錄失敗: ' + error.message);
    }
}

function displayAttendanceStatus() {
    const attendanceContent = document.getElementById('attendanceContent');
    
    if (!attendanceContent) {
        console.error('attendanceContent element not found');
        return;
    }

    const { hasAttendance, hasClockIn, hasClockOut } = todayAttendance;
    
    attendanceContent.innerHTML = `
        <div class="attendance-card">
            <h3>今日考勤狀態</h3>
            <div class="attendance-info">
                <p><strong>項目:</strong> ${currentProject.orderNumber || currentProject.projectName}</p>
                <p><strong>考勤狀態:</strong> <span class="status-${hasAttendance ? 'success' : 'pending'}">${hasAttendance ? '已出席' : '未出席'}</span></p>
                ${hasClockIn ? `<p><strong>打卡時間:</strong> ${formatDate(todayAttendance.attendance.clockIn)}</p>` : ''}
            </div>
        </div>
        
        <div class="attendance-actions">
            ${!hasAttendance ? `
                <button class="btn btn-success" onclick="clockIn()">
                    <i>✅</i> 出席打卡
                </button>
            ` : `
                <div class="attendance-complete">
                    <p>今日已出席</p>
                </div>
            `}
        </div>
    `;
}

async function clockIn() {
    try {
        if (!currentProject) {
            showMessage('請先選擇一個項目');
            return;
        }

        const response = await apiRequest('/mobile-attendance/clock-in', {
            method: 'POST',
            body: JSON.stringify({
                projectId: currentProject._id
            })
        });

        if (response.success) {
            showMessage('出席打卡成功！', 'success');
            loadTodayAttendance(); // 重新加載考勤狀態
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        showMessage('打卡失敗: ' + error.message);
    }
}

function handleImageSelection() {
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!imageInput || !imagePreview) return;
    
    imageInput.addEventListener('change', function(e) {
        imagePreview.innerHTML = '';
        
        Array.from(e.target.files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const imageDiv = document.createElement('div');
                imageDiv.className = 'image-preview-item';
                
                reader.onload = function(e) {
                    imageDiv.style.backgroundImage = `url(${e.target.result})`;
                    imagePreview.appendChild(imageDiv);
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

async function submitProgress(formData) {
    try {
        const response = await fetch(`${API_BASE}/mobile-project/record-progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('進度記錄提交成功！', 'success');
            document.getElementById('progressForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            
            // 刷新項目列表
            if (document.getElementById('projectsPage').classList.contains('active')) {
                loadProjects();
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showMessage('提交進度記錄失敗: ' + error.message);
    }
}

// 事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authentication...');
    
    // 檢查是否已登入
    if (authToken && currentUser) {
        console.log('User already logged in, showing main section');
        showMainSection();
        loadProjects();
    } else {
        console.log('No authentication found, showing login section');
        showLoginSection();
    }
    
    // 登入表單
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const phone = document.getElementById('phone').value;
            login(phone);
        });
    }
    
    // 進度記錄表單
    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
        progressForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('workProcessId', document.getElementById('workProcess').value);
            formData.append('workDescription', document.getElementById('workDescription').value);
            formData.append('completedWork', document.getElementById('completedWork').value);
            formData.append('progressIncrement', document.getElementById('progressIncrement').value || 0);
            formData.append('hoursWorked', document.getElementById('hoursWorked').value);
            formData.append('location', document.getElementById('location').value);
            
            // 添加圖片文件
            const images = document.getElementById('images').files;
            for (let i = 0; i < images.length; i++) {
                formData.append('images', images[i]);
            }
            
            submitProgress(formData);
        });
    }
    
    // 返回按鈕
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    // 圖片選擇處理
    handleImageSelection();
});

// 全局函數供HTML調用
window.showPage = showPage;
window.showProjectDetail = showProjectDetail;
window.logout = logout;
window.clockIn = clockIn;
window.selectProjectForAttendance = selectProjectForAttendance;
