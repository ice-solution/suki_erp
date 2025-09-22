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

// 更新WorkProgress進度
router.put('/workprogress/:id', catchErrors(mobileProjectController.updateWorkProgress));

// 上傳圖片
router.post('/upload-image', catchErrors(mobileProjectController.uploadImage));

module.exports = router;
