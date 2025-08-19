// 模擬API響應數據
const mockData = {
  // 模擬員工數據
  employee: {
    _id: 'mock_employee_001',
    name: '張三',
    phone: '98765432',
    email: 'zhangsan@example.com',
    position: '工程師',
    contractor: {
      _id: 'mock_contractor_001',
      name: 'ABC工程公司'
    },
    lastLogin: new Date().toISOString()
  },

  // 模擬項目數據
  projects: [
    {
      _id: 'mock_project_001',
      orderNumber: 'PRJ-2024-001',
      projectName: '香港灣仔商業大廈裝修工程',
      description: '商業大廈內部裝修工程，包括辦公室、會議室、公共區域等',
      client: {
        _id: 'mock_client_001',
        name: '香港地產發展有限公司'
      },
      contractor: {
        _id: 'mock_contractor_001',
        name: 'ABC工程公司'
      },
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-06-30T00:00:00.000Z',
      status: 'in_progress',
      priority: 'high',
      progress: 65,
      employeeRole: {
        position: '工程師',
        joinDate: '2024-01-15T00:00:00.000Z',
        hourlyRate: 150,
        responsibilities: '負責電氣系統安裝和調試',
        status: 'active'
      }
    },
    {
      _id: 'mock_project_002',
      orderNumber: 'PRJ-2024-002',
      projectName: '九龍灣工業大廈翻新工程',
      description: '工業大廈外牆翻新和內部設施升級',
      client: {
        _id: 'mock_client_002',
        name: '九龍工業集團'
      },
      contractor: {
        _id: 'mock_contractor_001',
        name: 'ABC工程公司'
      },
      startDate: '2024-02-01T00:00:00.000Z',
      endDate: '2024-08-31T00:00:00.000Z',
      status: 'pending',
      priority: 'medium',
      progress: 0,
      employeeRole: {
        position: '工程師',
        joinDate: '2024-02-01T00:00:00.000Z',
        hourlyRate: 150,
        responsibilities: '負責機械設備安裝',
        status: 'active'
      }
    }
  ],

  // 模擬項目詳情數據
  projectDetail: {
    project: {
      _id: 'mock_project_001',
      orderNumber: 'PRJ-2024-001',
      projectName: '香港灣仔商業大廈裝修工程',
      description: '商業大廈內部裝修工程，包括辦公室、會議室、公共區域等',
      location: '香港灣仔軒尼詩道123號',
      client: {
        _id: 'mock_client_001',
        name: '香港地產發展有限公司'
      },
      contractor: {
        _id: 'mock_contractor_001',
        name: 'ABC工程公司'
      },
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-06-30T00:00:00.000Z',
      status: 'in_progress',
      priority: 'high',
      progress: 65
    },
    statistics: {
      totalProcesses: 8,
      completedProcesses: 5,
      averageProgress: 65,
      overdueProcesses: 1
    },
    workProcesses: [
      {
        _id: 'mock_process_001',
        name: '電氣系統安裝',
        sequence: 1,
        progress: 80,
        status: 'in_progress',
        isOverdue: false,
        canRecord: true
      },
      {
        _id: 'mock_process_002',
        name: '空調系統安裝',
        sequence: 2,
        progress: 60,
        status: 'in_progress',
        isOverdue: false,
        canRecord: true
      },
      {
        _id: 'mock_process_003',
        name: '消防系統安裝',
        sequence: 3,
        progress: 100,
        status: 'completed',
        isOverdue: false,
        canRecord: false
      },
      {
        _id: 'mock_process_004',
        name: '內部裝修',
        sequence: 4,
        progress: 40,
        status: 'in_progress',
        isOverdue: true,
        canRecord: true
      }
    ],
    recentProgress: [
      {
        _id: 'mock_progress_001',
        workProcess: {
          _id: 'mock_process_001',
          name: '電氣系統安裝'
        },
        recordDate: '2024-03-15T10:30:00.000Z',
        submittedBy: {
          employee: {
            name: '張三'
          }
        },
        workDescription: '完成了主配電箱的安裝和接線工作',
        progressIncrement: 15
      },
      {
        _id: 'mock_progress_002',
        workProcess: {
          _id: 'mock_process_002',
          name: '空調系統安裝'
        },
        recordDate: '2024-03-14T16:45:00.000Z',
        submittedBy: {
          employee: {
            name: '李四'
          }
        },
        workDescription: '安裝了中央空調主機和管道系統',
        progressIncrement: 20
      }
    ]
  }
};

// 模擬API函數
function mockApiRequest(url, options = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let response;
      
      if (url === '/mobile-auth/login' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        if (body.phone === '98765432') {
          response = {
            success: true,
            result: {
              employee: mockData.employee,
              token: 'mock_jwt_token_12345',
              refreshToken: 'mock_refresh_token_12345'
            },
            message: '登入成功'
          };
        } else {
          response = {
            success: false,
            result: null,
            message: '找不到對應的員工記錄'
          };
        }
      } else if (url === '/mobile-project/my-projects') {
        response = {
          success: true,
          result: {
            projects: mockData.projects,
            stats: {
              total: mockData.projects.length,
              active: mockData.projects.filter(p => p.status === 'in_progress').length,
              completed: mockData.projects.filter(p => p.status === 'completed').length,
              pending: mockData.projects.filter(p => p.status === 'pending').length
            },
            pagination: {
              current: 1,
              pageSize: 20,
              total: mockData.projects.length,
              totalPages: 1
            }
          },
          message: `成功獲取 ${mockData.projects.length} 個項目`
        };
      } else if (url.startsWith('/mobile-project/project/')) {
        response = {
          success: true,
          result: mockData.projectDetail,
          message: '成功獲取項目詳情'
        };
      } else if (url === '/mobile-auth/profile') {
        response = {
          success: true,
          result: {
            employee: mockData.employee,
            statistics: {
              totalProjects: mockData.projects.length,
              completedProcesses: 5,
              totalHours: 120
            }
          },
          message: '成功獲取個人資料'
        };
      } else {
        response = {
          success: false,
          result: null,
          message: 'API端點不存在'
        };
      }
      
      resolve({
        ok: response.success,
        json: () => Promise.resolve(response)
      });
    }, 500); // 模擬網絡延遲
  });
}

// 導出模擬函數
window.mockApiRequest = mockApiRequest;

