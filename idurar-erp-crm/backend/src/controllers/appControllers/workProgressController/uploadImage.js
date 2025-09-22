const path = require('path');
const fs = require('fs');
const slugify = require('slugify');

const uploadImage = async (req, res) => {
  try {
    console.log('📤 WorkProgress image upload request');
    console.log('📁 Files received:', req.files);

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: '沒有收到圖片文件',
      });
    }

    const imageFile = req.files.image;
    console.log('🖼️ Image file details:', {
      name: imageFile.name,
      size: imageFile.size,
      mimetype: imageFile.mimetype
    });

    // 驗證文件類型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF 格式的圖片',
      });
    }

    // 驗證文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: '圖片大小不能超過 5MB',
      });
    }

    // 創建上傳目錄
    const uploadDir = path.join(__dirname, '../../../public/uploads/workprogress');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 生成安全的文件名
    const fileExtension = path.extname(imageFile.name) || '.jpg';
    const baseName = path.parse(imageFile.name).name || 'workprogress-image';
    const safeBaseName = slugify(baseName, { lower: true, strict: true }) || 'image';
    const timestamp = Date.now();
    const safeFileName = `${safeBaseName}-${timestamp}${fileExtension}`;
    
    const filePath = path.join(uploadDir, safeFileName);
    const publicPath = `/uploads/workprogress/${safeFileName}`;

    console.log('💾 Saving file to:', filePath);
    console.log('🌐 Public path:', publicPath);

    // 移動文件到目標位置
    await imageFile.mv(filePath);

    // 驗證文件是否成功保存
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        success: false,
        message: '文件保存失敗',
      });
    }

    console.log('✅ Image uploaded successfully:', publicPath);

    return res.status(200).json({
      success: true,
      result: {
        originalName: imageFile.name,
        fileName: safeFileName,
        path: publicPath,
        size: imageFile.size,
        mimetype: imageFile.mimetype,
      },
      message: '圖片上傳成功',
    });

  } catch (error) {
    console.error('❌ Error uploading WorkProgress image:', error);
    return res.status(500).json({
      success: false,
      message: '圖片上傳失敗: ' + error.message,
    });
  }
};

module.exports = uploadImage;
