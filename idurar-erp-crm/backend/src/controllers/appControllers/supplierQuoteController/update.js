const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');
const Ship = mongoose.model('Ship');
const Winch = mongoose.model('Winch');

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

  // Parse materials to check if we have items or materials
  let materials = req.body.materials || [];
  if (typeof materials === 'string') {
    try {
      materials = JSON.parse(materials);
    } catch (error) {
      materials = [];
    }
  }
  if (!Array.isArray(materials)) {
    materials = [];
  }

  // Items or materials must have at least one entry
  if ((!Array.isArray(items) || items.length === 0) && (!Array.isArray(materials) || materials.length === 0)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items or materials cannot be empty',
    });
  }
  // default
  let subTotal = 0;
  let discountTotal = 0;
  let total = 0;
  // let credit = 0;

  // subTotal = materials 總計 + items 總計（兩者都參與價格計算，允許負數）
  // 1) Materials：price 為總價
  if (materials.length > 0) {
    materials.forEach((material) => {
      if (material && material.price !== undefined && material.price !== null) {
        subTotal = calculate.add(subTotal, Number(material.price));
      }
    });
  }
  // 2) Items：quantity * price 計入 subTotal
  if (items.length > 0) {
    items.forEach((item) => {
      if (item && item.quantity != null && item.price !== undefined && item.price !== null) {
        const itemTotal = calculate.multiply(item.quantity, item.price);
        item['total'] = itemTotal;
        subTotal = calculate.add(subTotal, itemTotal);
      }
    });
  }

  discountTotal = calculate.multiply(subTotal, discount / 100);
  total = calculate.sub(subTotal, discountTotal);

  let body = req.body;

  // 若前端有送 subTotal / total（手動編輯），則採用並據此計算 discountTotal
  const bodySubTotal = req.body.subTotal !== undefined && req.body.subTotal !== null && req.body.subTotal !== ''
    ? Number(req.body.subTotal)
    : undefined;
  const bodyTotal = req.body.total !== undefined && req.body.total !== null && req.body.total !== ''
    ? Number(req.body.total)
    : undefined;
  if (!Number.isNaN(bodySubTotal)) body['subTotal'] = bodySubTotal;
  else body['subTotal'] = subTotal;
  if (!Number.isNaN(bodyTotal)) body['total'] = bodyTotal;
  else body['total'] = total;
  body['discountTotal'] = Number(calculate.sub(body['subTotal'], body['total']).toFixed(2));

  // Parse other JSON fields from FormData
  if (typeof body.clients === 'string') {
    try {
      body.clients = JSON.parse(body.clients);
    } catch (error) {
      // Keep as string if not valid JSON
    }
  }

  body['items'] = items;
  body['materials'] = materials;
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
  // 先獲取現有的SupplierQuote記錄，以便檢查之前的ship和winch
  const existingQuote = await Model.findOne({ _id: req.params.id, removed: false }).exec();
  
  // Find document by id and updates with the required fields
  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // 如果有船隻或爬攬器，更新它們的status、supplierNumber和expiredDate
  const supplierQuoteNumber = `${result.numberPrefix || 'S'}-${result.number}`;
  const expiredDate = body.expiredDate ? new Date(body.expiredDate) : null;

  // 處理船隻：如果之前有ship但現在沒有，將之前的ship狀態改為回倉
  if (existingQuote && existingQuote.ship) {
    const oldShipId = typeof existingQuote.ship === 'object' ? existingQuote.ship._id.toString() : existingQuote.ship.toString();
    const newShipId = body.ship ? (typeof body.ship === 'object' ? body.ship.toString() : body.ship.toString()) : null;
    
    // 如果ship被移除了（之前有，現在沒有）
    if (!newShipId || oldShipId !== newShipId) {
      await Ship.findByIdAndUpdate(oldShipId, {
        status: 'returned_warehouse_hk', // 預設為回倉(表衣)
        supplierNumber: null,
        expiredDate: null,
        updated: new Date()
      });
    }
  }

  // 處理爬攬器：如果之前有winch但現在沒有，將之前的winch狀態改為回倉
  if (existingQuote && existingQuote.winch) {
    const oldWinchId = typeof existingQuote.winch === 'object' ? existingQuote.winch._id.toString() : existingQuote.winch.toString();
    const newWinchId = body.winch ? (typeof body.winch === 'object' ? body.winch.toString() : body.winch.toString()) : null;
    
    // 如果winch被移除了（之前有，現在沒有）
    if (!newWinchId || oldWinchId !== newWinchId) {
      await Winch.findByIdAndUpdate(oldWinchId, {
        status: 'returned_warehouse_hk', // 預設為回倉(表衣)
        supplierNumber: null,
        expiredDate: null,
        updated: new Date()
      });
    }
  }

  // 更新新的船隻
  if (body.ship) {
    await Ship.findByIdAndUpdate(body.ship, {
      status: 'in_use',
      supplierNumber: supplierQuoteNumber,
      expiredDate: expiredDate,
      updated: new Date()
    });
  }

  // 更新新的爬攬器
  if (body.winch) {
    await Winch.findByIdAndUpdate(body.winch, {
      status: 'in_use',
      supplierNumber: supplierQuoteNumber,
      expiredDate: expiredDate,
      updated: new Date()
    });
  }

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
