const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
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

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
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
  body['pdf'] = 'supplier-quote-' + req.params.id + '.pdf';

  // Handle file uploads using express-fileupload
  if (req.files) {
    
    // Get existing record once for file merging
    const existingRecord = await Model.findById(req.params.id);
    
    // Process DM files
    if (req.files.dmFiles) {
      const dmFiles = Array.isArray(req.files.dmFiles) ? req.files.dmFiles : [req.files.dmFiles];
      const { slugify } = require('transliteration');
      const path = require('path');
      
      const processedDmFiles = [];
      
      for (let file of dmFiles) {
        const fileExtension = path.extname(file.name) || '.unknown';
        const originalName = path.parse(file.name).name || 'dmfile';
        const uniqueId = Math.random().toString(36).slice(2, 7);
        
        // Create safe filename while preserving original name for display
        const slugifiedName = slugify(originalName) || 'dmfile';
        let safeFileName = `${slugifiedName}-${uniqueId}${fileExtension}`;
        
        console.log('🔧 DM File processing:');
        console.log('  Original name:', originalName);
        console.log('  Slugified name:', slugifiedName);
        console.log('  Safe filename:', safeFileName);
        console.log('  Extension:', fileExtension);
        
        // Ensure safeFileName is never undefined or empty
        if (!safeFileName || safeFileName.startsWith('-') || safeFileName === uniqueId) {
          safeFileName = `dmfile-${uniqueId}${fileExtension}`;
          console.log('  ⚠️ Using fallback filename:', safeFileName);
        }
        
        // Debug and fix filename encoding
        console.log('🔍 Processing DM file:');
        console.log('  Raw file.name:', file.name);
        console.log('  File.name type:', typeof file.name);
        
        // For now, use original filename and let frontend handle encoding
        const displayName = file.name;
        
        const fileInfo = {
          id: uniqueId,
          name: displayName, // Properly decoded name for display
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
        console.log('📋 Added DM fileInfo to array:', fileInfo);
      }
      
      const existingDmFiles = existingRecord.dmFiles || [];
      body['dmFiles'] = [...existingDmFiles, ...processedDmFiles];
      console.log('📁 Final DM files array:', body['dmFiles']);
    }
    
    // Process Invoice files
    if (req.files.invoiceFiles) {
      const invoiceFiles = Array.isArray(req.files.invoiceFiles) ? req.files.invoiceFiles : [req.files.invoiceFiles];
      const { slugify } = require('transliteration');
      const path = require('path');
      
      const processedInvoiceFiles = [];
      
      for (let file of invoiceFiles) {
        const fileExtension = path.extname(file.name) || '.unknown';
        const originalName = path.parse(file.name).name || 'invoicefile';
        const uniqueId = Math.random().toString(36).slice(2, 7);
        
        // Create safe filename while preserving original name for display
        const slugifiedName = slugify(originalName) || 'invoicefile';
        let safeFileName = `${slugifiedName}-${uniqueId}${fileExtension}`;
        
        console.log('🔧 Invoice File processing:');
        console.log('  Original name:', originalName);
        console.log('  Slugified name:', slugifiedName);
        console.log('  Safe filename:', safeFileName);
        
        // Ensure safeFileName is never undefined or empty
        if (!safeFileName || safeFileName.startsWith('-') || safeFileName === uniqueId) {
          safeFileName = `invoicefile-${uniqueId}${fileExtension}`;
          console.log('  ⚠️ Using fallback filename:', safeFileName);
        }
        
        // For now, use original filename and let frontend handle encoding
        const displayName = file.name;
        
        const fileInfo = {
          id: uniqueId,
          name: displayName, // Properly decoded name for display
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
        console.log('📋 Added Invoice fileInfo to array:', fileInfo);
      }
      
      const existingInvoiceFiles = existingRecord.invoiceFiles || [];
      body['invoiceFiles'] = [...existingInvoiceFiles, ...processedInvoiceFiles];
      console.log('📁 Final Invoice files array:', body['invoiceFiles']);
    }
  }

  if ('currency' in body) {
    delete body.currency;
  }
  // Find document by id and updates with the required fields

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  console.log('📤 Returning result with files:');
  console.log('  DM files count:', result.dmFiles?.length || 0);
  console.log('  Invoice files count:', result.invoiceFiles?.length || 0);
  if (result.dmFiles?.length > 0) {
    console.log('  Sample DM file:', result.dmFiles[result.dmFiles.length - 1]);
  }
  if (result.invoiceFiles?.length > 0) {
    console.log('  Sample Invoice file:', result.invoiceFiles[result.invoiceFiles.length - 1]);
  }

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};
module.exports = update;
