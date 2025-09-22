const path = require('path');
const fs = require('fs');
const slugify = require('slugify');

// 上傳WorkProgress圖片
const uploadImage = async (req, res) => {
  try {
    console.log('📤 收到圖片上傳請求');
    console.log('req.files:', req.files);
    console.log('req.body:', req.body);
    
    if (!req.files || !req.files.image) {
      console.log('❌ 沒有找到圖片文件');
      return res.status(400).json({
        success: false,
        result: null,
        message: '請選擇要上傳的圖片'
      });
    }
    
    const image = req.files.image;
    
    // 驗證文件類型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(image.mimetype)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '只支持 JPG、PNG、GIF 格式的圖片'
      });
    }
    
    // 驗證文件大小 (最大5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '圖片大小不能超過5MB'
      });
    }
    
    // 創建上傳目錄
    const uploadDir = path.join(__dirname, '../../../public/uploads/workprogress');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成安全的文件名
    const timestamp = Date.now();
    const originalName = image.name;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const safeName = slugify(baseName, { lower: true, strict: true });
    const fileName = `image-${timestamp}-${safeName}${extension}`;
    
    // 移動文件
    const filePath = path.join(uploadDir, fileName);
    await image.mv(filePath);
    
    // 返回相對路徑
    const relativePath = `/uploads/workprogress/${fileName}`;
    
    console.log('✅ 圖片上傳成功:', relativePath);
    
    return res.status(200).json({
      success: true,
      result: {
        imagePath: relativePath,
        fileName: fileName
      },
      message: '圖片上傳成功'
    });
    
  } catch (error) {
    console.error('❌ 圖片上傳失敗:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '圖片上傳失敗: ' + error.message
    });
  }
};

module.exports = uploadImage;
