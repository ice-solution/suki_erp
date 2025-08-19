const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');
const WorkProcess = mongoose.model('WorkProcess');
const ProjectEmployee = mongoose.model('ProjectEmployee');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 設置multer儲存配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../../public/uploads/mobile-progress');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // 最多10個文件
  },
  fileFilter: function (req, file, cb) {
    // 只允許圖片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件'), false);
    }
  }
});

const recordProgress = async (req, res) => {
  try {
    const {
      workProcessId,
      workDescription,
      completedWork,
      progressIncrement = 0,
      hoursWorked,
      location,
      recordDate = new Date()
    } = req.body;

    const employeeId = req.employee._id;

    // 驗證必填欄位
    if (!workProcessId || !workDescription || !completedWork || !hoursWorked) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請填寫所有必填欄位',
      });
    }

    // 獲取工序信息
    const workProcess = await WorkProcess.findById(workProcessId).populate('project');
    if (!workProcess || workProcess.removed) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '工序不存在',
      });
    }

    // 驗證員工是否有權限記錄此項目的進度
    const projectEmployee = await ProjectEmployee.findOne({
      project: workProcess.project._id,
      employee: employeeId,
      removed: false,
      status: 'active'
    });

    if (!projectEmployee) {
      return res.status(403).json({
        success: false,
        result: null,
        message: '無權限記錄此項目的進度',
      });
    }

    // 處理上傳的圖片
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/mobile-progress/${file.filename}`,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: employeeId,
          uploadedAt: new Date()
        });
      });
    }

    // 創建進度記錄
    const progressRecord = new WorkProgressRecord({
      workProcess: workProcessId,
      project: workProcess.project._id,
      submittedBy: projectEmployee._id,
      recordDate: new Date(recordDate),
      workDescription,
      completedWork,
      progressIncrement: Number(progressIncrement) || 0,
      hoursWorked: Number(hoursWorked),
      location,
      images,
      status: 'submitted',
      createdBy: employeeId
    });

    await progressRecord.save();

    // 更新工序進度
    if (progressIncrement > 0) {
      const newProgress = Math.min(100, (workProcess.progress || 0) + Number(progressIncrement));
      workProcess.progress = newProgress;
      
      // 如果進度達到100%，更新狀態和完成時間
      if (newProgress >= 100) {
        workProcess.status = 'completed';
        if (!workProcess.actualEndDate) {
          workProcess.actualEndDate = new Date();
        }
      } else if (newProgress > 0 && workProcess.status === 'pending') {
        workProcess.status = 'in_progress';
        if (!workProcess.actualStartDate) {
          workProcess.actualStartDate = new Date();
        }
      }
      
      await workProcess.save();
    }

    // 填充返回數據
    await progressRecord.populate([
      {
        path: 'submittedBy',
        populate: {
          path: 'employee',
          select: 'name'
        }
      },
      {
        path: 'workProcess',
        select: 'name sequence'
      }
    ]);

    return res.status(201).json({
      success: true,
      result: {
        progressRecord,
        updatedWorkProcess: {
          _id: workProcess._id,
          progress: workProcess.progress,
          status: workProcess.status,
          actualStartDate: workProcess.actualStartDate,
          actualEndDate: workProcess.actualEndDate
        }
      },
      message: '進度記錄提交成功',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '記錄進度失敗: ' + error.message,
    });
  }
};

// 導出中間件和控制器
module.exports = {
  upload: upload.array('images', 10), // 最多10張圖片
  recordProgress
};
