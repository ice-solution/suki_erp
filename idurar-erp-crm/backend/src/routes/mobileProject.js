const express = require('express');
const router = express.Router();
const mobileProjectController = require('../controllers/appControllers/mobileProjectController');
const mobileAuth = require('../middlewares/mobileAuth');
const { catchErrors } = require('../handlers/errorHandlers');

// 所有路由都需要認證
router.use(mobileAuth.isValidMobileToken);

// 獲取contractor的項目列表
router.get('/contractor-projects', catchErrors(mobileProjectController.getContractorProjects));

// 獲取項目的WorkProgress列表
router.get('/project/:projectId/workprogress', catchErrors(mobileProjectController.getProjectWorkProgress));

// 獲取項目的員工列表
router.get('/project/:projectId/employees', catchErrors(mobileProjectController.getProjectEmployees));

// 批量打咭（複數選擇員工然後打咭）
router.post('/project/:projectId/batch-checkin', catchErrors(mobileProjectController.batchCheckIn));

// 獲取指定日期的員工打咭狀態（用於補打咭）
router.get('/project/:projectId/attendance-by-date', catchErrors(mobileProjectController.getAttendanceByDate));

// 補打咭
router.post('/project/:projectId/makeup-checkin', catchErrors(mobileProjectController.makeupCheckIn));

// 更新WorkProgress進度
router.put('/workprogress/:id', catchErrors(mobileProjectController.updateWorkProgress));

// 上傳圖片
router.post('/upload-image', catchErrors(mobileProjectController.uploadImage));

module.exports = router;
