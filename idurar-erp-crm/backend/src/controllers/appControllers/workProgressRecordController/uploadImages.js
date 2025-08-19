const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置multer用於圖片上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../../public/uploads/progress');
    // 確保目錄存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `progress-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // 只允許圖片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 10 // 最多10個文件
  }
});

const uploadImages = async (req, res) => {
  try {
    // 使用multer中間件處理上傳
    upload.array('images', 10)(req, res, async function (err) {
      if (err) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Image upload failed: ' + err.message,
        });
      }

      const { recordId } = req.params;
      const { descriptions } = req.body; // 圖片描述數組

      // 查找進度記錄
      const progressRecord = await WorkProgressRecord.findById(recordId);
      if (!progressRecord) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Progress record not found',
        });
      }

      // 處理上傳的文件
      const uploadedImages = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
          const imageData = {
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/progress/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size,
            description: descriptions && descriptions[index] ? descriptions[index] : '',
            uploadedAt: new Date()
          };
          uploadedImages.push(imageData);
        });

        // 添加到進度記錄
        progressRecord.images.push(...uploadedImages);
        await progressRecord.save();
      }

      // 重新填充數據
      await progressRecord.populate([
        'workProcess',
        'project',
        {
          path: 'submittedBy',
          populate: {
            path: 'employee',
            model: 'ContractorEmployee'
          }
        },
        'reviewedBy'
      ]);

      return res.status(200).json({
        success: true,
        result: {
          progressRecord,
          uploadedImages
        },
        message: `Successfully uploaded ${uploadedImages.length} images`,
      });
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error uploading images: ' + error.message,
    });
  }
};

module.exports = uploadImages;
