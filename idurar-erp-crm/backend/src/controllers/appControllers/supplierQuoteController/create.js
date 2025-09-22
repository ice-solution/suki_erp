const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

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

  //Calculate the items array with subTotal, total, discountTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
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
  // Returning successfull response

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
