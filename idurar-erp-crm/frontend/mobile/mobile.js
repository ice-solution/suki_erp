// 全局變量
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentProject = null;
let currentWorkProgress = null;

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
        console.log('Starting login process for phone:', phone);
        const response = await apiRequest('/mobile-auth/login', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });

        console.log('Login response:', response);

        if (response.success) {
            authToken = response.result.token;
            currentUser = response.result.contractor;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            console.log('Login successful, showing main section');
            showMainSection();
            loadProjects();
        } else {
            throw new Error(response.message || '登入失敗');
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
    document.getElementById('headerSubtitle').textContent = '請輸入手機號碼登入';
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
        case 'workprogress':
            document.getElementById('workProgressPage').classList.add('active');
            document.getElementById('headerTitle').textContent = '工作進度';
            document.getElementById('headerSubtitle').textContent = '查看工作進度';
            document.getElementById('backBtn').style.display = 'block';
            loadWorkProgress();
            break;
        case 'updateProgress':
            document.getElementById('updateProgressPage').classList.add('active');
            document.getElementById('headerTitle').textContent = '更新進度';
            document.getElementById('headerSubtitle').textContent = '記錄工作進度';
            document.getElementById('backBtn').style.display = 'block';
            break;
    }
}

function goBack() {
    if (document.getElementById('updateProgressPage').classList.contains('active')) {
        showPage('workprogress');
    } else if (document.getElementById('workProgressPage').classList.contains('active')) {
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
        showMessage('加載項目失敗: ' + error.message);
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
        <div class="project-card" onclick="showProjectWorkProgress('${project._id}')">
            <div class="project-title">${project.name || '未命名項目'}</div>
            <div class="project-info">P.O Number: ${project.poNumber || '未設定'}</div>
            <div class="project-info">描述：${project.description || '未設定'}</div>
            <div class="project-info">開始日期：${formatDate(project.startDate)}</div>
            <div class="project-info">
                工作進度：${project.workProgressStats?.total || 0} 項
                <span class="status-badge status-${project.status}">${getStatusText(project.status)}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${formatProgress(project.workProgressStats?.averageProgress)}%"></div>
            </div>
            <div style="font-size: 12px; color: #666; text-align: right;">
                平均進度：${formatProgress(project.workProgressStats?.averageProgress)}%
            </div>
        </div>
    `).join('');
}

async function showProjectWorkProgress(projectId) {
    currentProject = projectId;
    showPage('workprogress');
}

async function loadWorkProgress() {
    if (!currentProject) {
        showMessage('請先選擇一個項目');
        return;
    }

    try {
        console.log('Loading work progress for project:', currentProject);
        const response = await apiRequest(`/mobile-project/project/${currentProject}/workprogress`);
        
        if (response.success) {
            displayWorkProgress(response.result);
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Failed to load work progress:', error);
        showMessage('加載工作進度失敗: ' + error.message);
        displayWorkProgress({ workProgressList: [] });
    }
}

function displayWorkProgress(data) {
    const workProgressList = document.getElementById('workProgressList');
    
    if (!workProgressList) {
        console.error('workProgressList element not found');
        return;
    }
    
    const { project, workProgressList: workProgresses } = data;
    
    if (!workProgresses || workProgresses.length === 0) {
        workProgressList.innerHTML = `
            <div class="loading">
                <p>此項目暫無工作進度記錄</p>
            </div>
        `;
        return;
    }
    
    workProgressList.innerHTML = `
        <div class="project-card">
            <div class="project-title">${project.name || '未命名項目'}</div>
            <div class="project-info">P.O Number: ${project.poNumber || '未設定'}</div>
            <div class="project-info">描述: ${project.description || '無'}</div>
        </div>
        
        ${workProgresses.map(wp => {
            console.log('WorkProgress data:', wp);
            console.log('Progress value:', wp.progress);
            return `
            <div class="workprogress-card">
                <div class="workprogress-title">${wp.item?.itemName || '未命名工作'}</div>
                <div class="workprogress-info">描述: ${wp.item?.description || '無'}</div>
                <div class="workprogress-info">數量: ${wp.item?.quantity || 0}</div>
                <div class="workprogress-info">負責員工: ${wp.contractorEmployee?.name || '未分配'}</div>
                <div class="workprogress-info">
                    狀態: <span class="status-badge status-${wp.status}">${getStatusText(wp.status)}</span>
                </div>
                <div class="workprogress-info">完工日期: ${formatDate(wp.completionDate)}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${formatProgress(wp.progress)}%"></div>
                </div>
                <div style="font-size: 12px; color: #666; text-align: right; margin-top: 8px;">
                    進度: ${formatProgress(wp.progress)}% (原始值: ${wp.progress})
                </div>
                <div style="margin-top: 12px;">
                    <button class="btn btn-small btn-success" onclick="updateWorkProgress('${wp._id}')">
                        更新進度
                    </button>
                </div>
            </div>
        `;
        }).join('')}
    `;
}

function updateWorkProgress(workProgressId) {
    currentWorkProgress = workProgressId;
    showPage('updateProgress');
}

// 處理圖片預覽
function handleImageSelection() {
    const imageInput = document.getElementById('progressImages');
    const imagePreview = document.getElementById('imagePreview');
    
    console.log('設置圖片選擇處理器，imageInput:', imageInput, 'imagePreview:', imagePreview);
    
    if (!imageInput || !imagePreview) {
        console.error('找不到圖片輸入元素或預覽元素');
        return;
    }
    
    imageInput.addEventListener('change', function(e) {
        console.log('圖片選擇事件觸發，文件數量:', e.target.files.length);
        imagePreview.innerHTML = '';
        
        Array.from(e.target.files).forEach((file, index) => {
            console.log(`處理文件 ${index}:`, file.name, file.type, file.size);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const imageDiv = document.createElement('div');
                imageDiv.className = 'image-preview-item';
                
                reader.onload = function(e) {
                    console.log('圖片讀取完成:', file.name);
                    imageDiv.style.backgroundImage = `url(${e.target.result})`;
                    imagePreview.appendChild(imageDiv);
                };
                reader.readAsDataURL(file);
            } else {
                console.warn('跳過非圖片文件:', file.name, file.type);
            }
        });
    });
}

// 上傳圖片
async function uploadImages(files) {
    console.log('開始上傳圖片，文件數量:', files.length);
    const uploadedImages = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`上傳文件 ${i}:`, file.name, file.type, file.size);
        
        if (file.type.startsWith('image/')) {
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                console.log('發送上傳請求到:', `${API_BASE}/mobile-project/upload-image`);
                const response = await fetch(`${API_BASE}/mobile-project/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                        // 注意：不要設置 Content-Type，讓瀏覽器自動設置 multipart/form-data
                    },
                    body: formData
                });
                
                console.log('上傳響應狀態:', response.status);
                const data = await response.json();
                console.log('上傳響應數據:', data);
                
                if (data.success) {
                    uploadedImages.push(data.result.imagePath);
                    console.log('圖片上傳成功:', data.result.imagePath);
                } else {
                    console.error('圖片上傳失敗:', data.message);
                }
            } catch (error) {
                console.error('圖片上傳錯誤:', error);
            }
        } else {
            console.warn('跳過非圖片文件:', file.name, file.type);
        }
    }
    
    console.log('上傳完成，成功上傳的圖片:', uploadedImages);
    return uploadedImages;
}

// 提交進度更新
async function submitProgressUpdate(formData) {
    try {
        console.log('提交進度更新，currentWorkProgress:', currentWorkProgress);
        
        if (!currentWorkProgress) {
            throw new Error('未選擇工作進度記錄');
        }
        
        const progressValue = document.getElementById('progressValue').value;
        const progressDescription = document.getElementById('progressDescription').value;
        const imageFiles = document.getElementById('progressImages').files;
        
        console.log('進度值:', progressValue, '描述:', progressDescription, '圖片數量:', imageFiles.length);
        
        // 上傳圖片
        const uploadedImages = await uploadImages(Array.from(imageFiles));
        console.log('上傳的圖片:', uploadedImages);
        
        const updateData = {
            progress: Number(progressValue),
            description: progressDescription,
            images: uploadedImages
        };
        console.log('發送的更新數據:', updateData);
        
        const response = await apiRequest(`/mobile-project/workprogress/${currentWorkProgress}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        if (response.success) {
            console.log('進度更新成功，重新載入數據');
            showMessage('進度更新成功！', 'success');
            // 清空表單
            document.getElementById('updateProgressForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            // 重新載入工作進度數據
            await loadWorkProgress();
            // 返回工作進度頁面
            showPage('workprogress');
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('更新進度失敗:', error);
        showMessage('更新進度失敗: ' + error.message);
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
    
    // 登入表單 - 使用更直接的方法
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, adding event listener');
        
        // 移除任何現有的事件監聽器
        loginForm.onsubmit = null;
        
        // 使用onclick事件而不是submit事件
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const phone = document.getElementById('phone').value.trim();
                console.log('Button clicked, phone value:', phone);
                
                if (phone) {
                    console.log('Attempting login with phone:', phone);
                    login(phone);
                } else {
                    console.log('No phone number provided');
                    showMessage('請輸入手機號碼');
                }
                
                return false;
            });
        }
        
        // 同時保留submit事件監聽器作為備用
        loginForm.addEventListener('submit', function(e) {
            console.log('Form submit event triggered');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const phone = document.getElementById('phone').value.trim();
            console.log('Phone value:', phone);
            
            if (phone) {
                console.log('Attempting login with phone:', phone);
                login(phone);
            } else {
                console.log('No phone number provided');
                showMessage('請輸入手機號碼');
            }
            
            return false;
        });
    } else {
        console.error('Login form not found!');
    }
    
    // 進度更新表單
    const updateProgressForm = document.getElementById('updateProgressForm');
    if (updateProgressForm) {
        updateProgressForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitProgressUpdate();
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
window.showProjectWorkProgress = showProjectWorkProgress;
window.updateWorkProgress = updateWorkProgress;
window.goBack = goBack;
window.logout = logout;