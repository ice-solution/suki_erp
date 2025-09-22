const multer = require('multer');
const path = require('path');
const { slugify } = require('transliteration');
const fs = require('fs');

const fileFilter = require('./utils/LocalfileFilter');

const multipleFileUpload = ({ entity, fileTypes = ['default'] }) => {
  // Create upload directory if it doesn't exist
  const uploadDir = `src/public/uploads/${entity}`;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  var diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      try {
        // fetching the file extension of the uploaded file
        let fileExtension = path.extname(file.originalname);
        let uniqueFileID = Math.random().toString(36).slice(2, 7); // generates unique ID of length 5

        let originalname = slugify(file.originalname.split('.')[0].toLocaleLowerCase());
        let _fileName = `${originalname}-${uniqueFileID}${fileExtension}`;

        const filePath = `public/uploads/${entity}/${_fileName}`;
        
        // Initialize upload arrays if they don't exist
        if (!req.uploads) {
          req.uploads = {};
        }
        
        // Store file info based on field name
        const fieldName = file.fieldname;
        if (!req.uploads[fieldName]) {
          req.uploads[fieldName] = [];
        }
        
        req.uploads[fieldName].push({
          id: uniqueFileID,
          name: file.originalname,
          fileName: _fileName,
          path: filePath,
          fieldExt: fileExtension,
          fileType: fileExtension.substring(1).toLowerCase(),
          isPublic: true,
        });

        cb(null, _fileName);
      } catch (error) {
        cb(error);
      }
    },
  });

  // Simplified file filter - accept common file types
  const combinedFilter = (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  };

  const multerStorage = multer({ 
    storage: diskStorage, 
    fileFilter: combinedFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  }).fields([
    { name: 'dmFiles', maxCount: 10 },
    { name: 'invoiceFiles', maxCount: 10 }
  ]);
  
  return multerStorage;
};

module.exports = multipleFileUpload;
