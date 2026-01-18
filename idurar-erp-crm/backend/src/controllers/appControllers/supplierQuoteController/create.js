const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');
const Ship = mongoose.model('Ship');
const Winch = mongoose.model('Winch');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
  // Handle FormData - parse JSON strings back to objects
  let { items = [], discount = 0 } = req.body;
  
  // Parse items if it's a JSON string (from FormData)
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (error) {
      items = [];
    }
  }
  
  // Ensure items is an array
  if (!Array.isArray(items)) {
    items = [];
  }
  
  // Parse discount if it's a string
  if (typeof discount === 'string') {
    discount = parseFloat(discount) || 0;
  }

  // default
  let subTotal = 0;
  let discountTotal = 0;
  let total = 0;
  // let credit = 0;

  // 注意：SupplierQuote 只計算 materials 的總計，不計算 items 的總計
  // Items 只用於記錄，不參與價格計算

  // Calculate materials total only
  let materials = req.body.materials || [];
  // Parse materials if it's a JSON string (from FormData)
  if (typeof materials === 'string') {
    try {
      materials = JSON.parse(materials);
    } catch (error) {
      materials = [];
    }
  }
  // Ensure materials is an array
  if (!Array.isArray(materials)) {
    materials = [];
  }
  if (materials.length > 0) {
    materials.forEach((material) => {
      if (material && material.quantity && material.price) {
        let materialTotal = calculate.multiply(material.quantity, material.price);
        subTotal = calculate.add(subTotal, materialTotal);
      }
    });
  }

  discountTotal = calculate.multiply(subTotal, discount / 100);
  total = calculate.sub(subTotal, discountTotal);

  let body = req.body;

  // Parse other JSON fields from FormData
  if (typeof body.clients === 'string') {
    try {
      body.clients = JSON.parse(body.clients);
    } catch (error) {
      // Keep as string if not valid JSON
    }
  }

  body['subTotal'] = subTotal;
  body['discountTotal'] = discountTotal;
  body['total'] = total;
  body['items'] = items;
  body['materials'] = materials;
  body['createdBy'] = req.admin._id;

  // Handle file uploads using express-fileupload
  if (req.files) {
    console.log('📁 Files received:', Object.keys(req.files));
    
    // Process DM files
    if (req.files.dmFiles) {
      const dmFiles = Array.isArray(req.files.dmFiles) ? req.files.dmFiles : [req.files.dmFiles];
      const { slugify } = require('transliteration');
      const path = require('path');
      
      const processedDmFiles = [];
      
      for (let file of dmFiles) {
        const fileExtension = path.extname(file.name);
        const originalName = path.parse(file.name).name;
        const uniqueId = Math.random().toString(36).slice(2, 7);
        
        // Create safe filename while preserving original name for display
        const safeFileName = `${slugify(originalName)}-${uniqueId}${fileExtension}`;
        
        const fileInfo = {
          id: uniqueId,
          name: file.name, // Keep original name for display (including Chinese)
          fileName: safeFileName, // Safe filename for storage
          path: `uploads/supplierquote/${safeFileName}`,
          fileType: fileExtension.substring(1).toLowerCase(),
          isPublic: true
        };
        
        // Move file with safe filename
        const uploadDir = 'src/public/uploads/supplierquote/';
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        await file.mv(uploadDir + safeFileName);
        processedDmFiles.push(fileInfo);
      }
      
      body['dmFiles'] = processedDmFiles;
    }
    
    // Process Invoice files
    if (req.files.invoiceFiles) {
      const invoiceFiles = Array.isArray(req.files.invoiceFiles) ? req.files.invoiceFiles : [req.files.invoiceFiles];
      const { slugify } = require('transliteration');
      const path = require('path');
      
      const processedInvoiceFiles = [];
      
      for (let file of invoiceFiles) {
        const fileExtension = path.extname(file.name);
        const originalName = path.parse(file.name).name;
        const uniqueId = Math.random().toString(36).slice(2, 7);
        
        // Create safe filename while preserving original name for display
        const safeFileName = `${slugify(originalName)}-${uniqueId}${fileExtension}`;
        
        const fileInfo = {
          id: uniqueId,
          name: file.name, // Keep original name for display (including Chinese)
          fileName: safeFileName, // Safe filename for storage
          path: `uploads/supplierquote/${safeFileName}`,
          fileType: fileExtension.substring(1).toLowerCase(),
          isPublic: true
        };
        
        // Move file with safe filename
        const uploadDir = 'src/public/uploads/supplierquote/';
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        await file.mv(uploadDir + safeFileName);
        processedInvoiceFiles.push(fileInfo);
      }
      
      body['invoiceFiles'] = processedInvoiceFiles;
    }
  }

  // Creating a new document in the collection
  const result = await new Model(body).save();
  const fileId = 'supplier-quote-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();

  // 如果有船隻或爬攬器，更新它們的status、supplierNumber和expiredDate
  const supplierQuoteNumber = `${result.numberPrefix || 'S'}-${result.number}`;
  const expiredDate = body.expiredDate ? new Date(body.expiredDate) : null;

  if (body.ship) {
    await Ship.findByIdAndUpdate(body.ship, {
      status: 'in_use',
      supplierNumber: supplierQuoteNumber,
      expiredDate: expiredDate,
      updated: new Date()
    });
  }

  if (body.winch) {
    await Winch.findByIdAndUpdate(body.winch, {
      status: 'in_use',
      supplierNumber: supplierQuoteNumber,
      expiredDate: expiredDate,
      updated: new Date()
    });
  }

  increaseBySettingKey({
    settingKey: 'last_supplier_quote_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Supplier Quote created successfully',
  });
};
module.exports = create;
