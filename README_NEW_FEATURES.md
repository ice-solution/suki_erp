# 新功能說明

## 概述
已成功建立承辦商管理系統，包含以下功能：

### 1. 承辦商管理 (Contractor)
- **模型**: `Contractor.js`
- **路由**: `/api/contractor`
- **前端頁面**: `/contractor`

**功能**:
- 新增承辦商
- 編輯承辦商資料
- 刪除承辦商 (軟刪除)
- 查詢承辦商列表
- 查詢單一承辦商

**欄位**:
- `name`: 承辦商名稱 (必填)
- `phone`: 電話
- `email`: 電郵
- `address`: 地址
- `country`: 國家

### 2. 承辦商員工管理 (ContractorEmployee)
- **模型**: `ContractorEmployee.js`
- **路由**: `/api/contractor-employee`
- **前端頁面**: `/contractor-employee`

**功能**:
- 新增承辦商員工
- 編輯員工資料
- 刪除員工 (軟刪除)
- 查詢員工列表
- 根據承辦商查詢員工

**欄位**:
- `name`: 員工姓名 (必填)
- `contractor`: 承辦商ID (必填，關聯到Contractor)
- `position`: 職位
- `phone`: 電話
- `email`: 電郵

### 3. 項目管理 (Project)
- **模型**: `Project.js`
- **路由**: `/api/project`
- **前端頁面**: `/project`

**功能**:
- 新增項目
- 編輯項目資料
- 刪除項目 (軟刪除)
- 查詢項目列表
- 根據狀態查詢項目
- 根據承辦商查詢項目

**欄位**:
- `orderNumber`: 訂單編號 (必填)
- `type`: 類型 (必填)
- `startDate`: 開始日期 (必填)
- `endDate`: 結束日期 (必填)
- `cost`: 成本 (必填)
- `contractor`: 承辦商ID (必填，關聯到Contractor)
- `contractorCost`: 承辦商成本 (必填)
- `createdBy`: 創建者ID (自動設置為當前登入用戶)
- `status`: 狀態 (pending/in_progress/completed/cancelled)
- `invoiceNumber`: 發票編號（類型 + 編號）
- `actualCost`: 實際成本
- `projectItems`: 工程項目ID陣列 (關聯到ProjectItem)

**Invoice/Quote 關聯**:
- Invoice模型添加 `project` 欄位 (關聯到Project)
- Quote模型添加 `project` 欄位 (關聯到Project)
- 在Project詳情頁面可以關聯Invoice和Quote

## API 端點

### 承辦商 API
```
GET    /api/contractor              # 查詢所有承辦商
POST   /api/contractor              # 新增承辦商
GET    /api/contractor/:id          # 查詢單一承辦商
PUT    /api/contractor/:id          # 更新承辦商
DELETE /api/contractor/:id          # 刪除承辦商
```

### 承辦商員工 API
```
GET    /api/contractor-employee                    # 查詢所有員工
POST   /api/contractor-employee                    # 新增員工
GET    /api/contractor-employee/:id                # 查詢單一員工
PUT    /api/contractor-employee/:id                # 更新員工
DELETE /api/contractor-employee/:id                # 刪除員工
GET    /api/contractor-employee/contractor/:id     # 根據承辦商查詢員工
```

### 項目 API
```
GET    /api/project                    # 查詢所有項目
POST   /api/project                    # 新增項目
GET    /api/project/:id                # 查詢單一項目
PUT    /api/project/:id                # 更新項目
DELETE /api/project/:id                # 刪除項目
GET    /api/project/status/:status     # 根據狀態查詢項目
GET    /api/project/contractor/:id     # 根據承辦商查詢項目
```

### Invoice/Quote 關聯 API
```
PATCH  /api/invoice/update/:id         # 更新發票 (添加project關聯)
PATCH  /api/quote/update/:id           # 更新報價單 (添加project關聯)
```

## 重要修正

### API URL 問題修正
**問題**: 前端API請求出現重複的 `/api/` 路徑，導致404錯誤
- 錯誤URL: `http://localhost:8888/api/api/project`
- 正確URL: `http://localhost:8888/api/project`

**解決方案**: 已修正所有前端頁面的API請求路徑
- 將 `/api/project` 改為 `/project`
- 將 `/api/contractor` 改為 `/contractor`
- 將 `/api/contractor-employee` 改為 `/contractor-employee`
- 將 `/api/project-item` 改為 `/project-item`

**原因**: axios的baseURL已設置為 `http://localhost:8888/api/`，所以前端請求路徑不需要包含 `/api/` 前綴。

### API 路徑修正
**問題**: 使用了錯誤的API路徑來獲取發票和報價單
- 錯誤: `/invoice` 和 `/quote`
- 正確: `/invoice/listAll` 和 `/quote/listAll`

**原因**: 系統的發票和報價單API使用標準的CRUD路徑，需要加上 `/listAll` 來獲取所有記錄。

### 欄位修正
**問題**: `owner` 欄位意義不明確
**修正**: 改為 `createdBy`，自動設置為當前登入用戶
- 移除了前端的 `owner` 輸入欄位
- 後端自動設置 `createdBy: req.admin._id`
- 前端顯示創建者姓名而不是ID

### 關聯設計修正
**問題**: Project和Invoice/Quote的關聯設計不當
**修正**: 改為one-to-many關係
- 移除了Project模型中的invoice和quotation欄位
- 在Invoice和Quote模型中添加project欄位
- 創建Project時不包含Invoice/Quote關聯
- 在Project詳情頁面可以後續關聯Invoice和Quote

## 前端路由

### 新增的路由
```
/contractor              # 承辦商列表
/contractor-employee     # 承辦商員工列表
/project                 # 項目列表
/project/detail/:id      # 項目詳情頁面
/project-items           # 工程項目列表 (已存在)
```

## 選單結構

### 新增的選單項目
- **承辦商管理** (包含子選單)
  - 承辦商列表
  - 承辦商員工
- **項目管理**
- **工程項目** (已存在)

### 選單圖標
- 承辦商管理: `BuildOutlined` (建築圖標)
- 項目管理: `ProjectOutlined` (項目圖標)
- 工程項目: `FileOutlined` (文件圖標)

## 使用方式

### 1. 啟動後端服務
```bash
cd idurar-erp-crm/backend
npm install
npm start
```

### 2. 啟動前端服務
```bash
cd idurar-erp-crm/frontend
npm install
npm start
```

### 3. 測試API
```bash
node test_api.js
```

### 4. 訪問前端頁面
- 承辦商管理: `http://localhost:3000/contractor`
- 承辦商員工管理: `http://localhost:3000/contractor-employee`
- 項目管理: `http://localhost:3000/project`
- 工程項目管理: `http://localhost:3000/project-items`

### 5. 選單導航
在左側選單中，您會看到：
- **承辦商管理** (可展開的子選單)
  - 承辦商列表
  - 承辦商員工
- **項目管理** (獨立選單項目)
- **工程項目** (獨立選單項目)

## 資料庫關聯

### 關聯關係
1. **ContractorEmployee** → **Contractor** (多對一)
2. **Project** → **Contractor** (多對一)
3. **Project** → **Invoice** (多對一，可選)
4. **Project** → **Quote** (多對一，可選)
5. **Project** → **ProjectItem** (多對多)

### 查詢範例
```javascript
// 查詢承辦商及其員工
const contractor = await Contractor.findById(id).populate('employees');

// 查詢項目及其相關資料
const project = await Project.findById(id)
  .populate('contractor')
  .populate('invoice')
  .populate('quotation')
  .populate('projectItems');
```

## 注意事項

1. 所有刪除操作都是軟刪除 (設置 `removed: true`)
2. 所有模型都包含 `createdBy` 和 `assigned` 欄位，用於追蹤創建者和負責人
3. 前端使用 Ant Design 組件庫，提供現代化的用戶界面
4. 所有日期欄位使用 ISO 格式存儲
5. 金額欄位使用數字類型，前端會自動格式化顯示

## 擴展建議

1. 添加權限控制
2. 添加審計日誌
3. 添加文件上傳功能
4. 添加報表功能
5. 添加通知系統
6. 添加工作流程管理 