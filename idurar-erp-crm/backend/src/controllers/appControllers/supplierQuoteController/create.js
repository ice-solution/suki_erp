const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');
const Ship = mongoose.model('Ship');
const Winch = mongoose.model('Winch');
const SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');
const {
  applySupplierQuoteMaterialsWarehouseSync,
  revertAppliedSupplierQuoteStockChanges,
} = require('@/helpers/supplierQuoteMaterialsWarehouseSync');

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

  // subTotal = materials 總計 + items 總計（兩者都參與價格計算，允許負數）
  // 1) Materials：price 為總價
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

  // 材料及費用管理：新增 S 單時依材料從倉庫扣庫（與 WarehouseInventory 貨品名稱、倉 A–D 需一致）
  let warehouseApplied = [];
  try {
    const syncRes = await applySupplierQuoteMaterialsWarehouseSync({
      oldMaterials: [],
      newMaterials: result.materials || [],
      supplierQuoteId: result._id,
      adminId: req.admin && req.admin._id,
    });
    warehouseApplied = syncRes.applied || [];
  } catch (syncErr) {
    await Model.findByIdAndDelete(result._id);
    return res.status(400).json({
      success: false,
      result: null,
      message: syncErr.message || '倉庫庫存同步失敗',
    });
  }

  const fileId = 'supplier-quote-' + result._id + '.pdf';
  let updateResult;
  try {
    updateResult = await Model.findOneAndUpdate(
      { _id: result._id },
      { pdf: fileId },
      {
        new: true,
      }
    ).exec();
  } catch (pdfErr) {
    try {
      await revertAppliedSupplierQuoteStockChanges(
        warehouseApplied,
        result._id,
        req.admin && req.admin._id
      );
    } catch (revertErr) {
      console.error('S單建立後 PDF 更新失敗且庫存回滾失敗:', revertErr);
    }
    await Model.findByIdAndDelete(result._id);
    return res.status(500).json({
      success: false,
      result: null,
      message: pdfErr.message || '建立失敗',
    });
  }

  // 如果有船隻或爬攬器，更新它們的status、supplierNumber和expiredDate
  const supplierQuoteNumber = `${result.numberPrefix || 'S'}-${result.number}`;
  const expiredDate = body.expiredDate ? new Date(body.expiredDate) : null;
  const quoteNumber = result.invoiceNumber || '';

  if (body.ship) {
    const shipId = typeof body.ship === 'object' ? body.ship._id : body.ship;
    await Ship.findByIdAndUpdate(shipId, {
      status: 'in_use',
      supplierNumber: supplierQuoteNumber,
      expiredDate: expiredDate,
      updated: new Date()
    });

    // 記錄：這次 S單綁定到船隻
    try {
      await SupplierQuoteAssetBinding.create({
        assetType: 'ship',
        ship: shipId,
        supplierQuote: result._id,
        supplierQuoteNumber,
        quoteNumber,
        createdBy: req.admin && req.admin._id ? req.admin._id : undefined,
      });
    } catch (bindingErr) {
      console.error('新增 SupplierQuoteAssetBinding（ship）失敗:', bindingErr);
    }
  }

  if (body.winch) {
    const winchId = typeof body.winch === 'object' ? body.winch._id : body.winch;
    await Winch.findByIdAndUpdate(winchId, {
      status: 'in_use',
      supplierNumber: supplierQuoteNumber,
      expiredDate: expiredDate,
      updated: new Date()
    });

    // 記錄：這次 S單綁定到爬攬器
    try {
      await SupplierQuoteAssetBinding.create({
        assetType: 'winch',
        winch: winchId,
        supplierQuote: result._id,
        supplierQuoteNumber,
        quoteNumber,
        createdBy: req.admin && req.admin._id ? req.admin._id : undefined,
      });
    } catch (bindingErr) {
      console.error('新增 SupplierQuoteAssetBinding（winch）失敗:', bindingErr);
    }
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
