const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const ShipQuote = mongoose.model('ShipQuote');
const Invoice = mongoose.model('Invoice');

const { calculate } = require('@/helpers');

const create = async (req, res) => {
  try {
    const { invoiceNumber, poNumber, costBy, contractorFees = [], contractorFee, description, address, startDate, endDate, contractors = [], name } = req.body;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invoice Number is required',
      });
    }

    // 預設專案名稱
    const projectName = name || invoiceNumber;

    // 檢查是否已存在相同 Invoice Number 的項目
    const existingProject = await Project.findOne({ invoiceNumber, removed: false });
    if (existingProject) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project with this Invoice Number already exists',
      });
    }

    // 根據 Invoice Number 查找相關的文件
    // 支持兩種查找方式：1) invoiceNumber 字段直接匹配 2) numberPrefix-number 組合匹配
    // 解析 invoiceNumber (例如 "SML-48133" -> prefix: "SML", number: "48133")
    let numberPrefix = null;
    let number = null;
    if (invoiceNumber && invoiceNumber.includes('-')) {
      const parts = invoiceNumber.split('-');
      if (parts.length >= 2) {
        numberPrefix = parts[0];
        number = parts.slice(1).join('-'); // 支持多個 "-" 的情況
      }
    }

    const findQuery = {
      $or: [
        { invoiceNumber, removed: false }
      ]
    };
    
    // 如果能夠解析出 prefix 和 number，也查找組合匹配
    if (numberPrefix && number) {
      findQuery.$or.push({
        numberPrefix,
        number,
        removed: false
      });
    }

    const quotations = await Quote.find(findQuery);
    const supplierQuotations = await SupplierQuote.find(findQuery);
    const shipQuotations = await ShipQuote.find(findQuery);
    const invoices = await Invoice.find(findQuery);

    console.log(`找到 ${quotations.length} 個quotations, ${supplierQuotations.length} 個supplier quotations, ${shipQuotations.length} 個ship quotations, ${invoices.length} 個invoices`);

    // 計算成本價 (quotations總額 + shipQuotations總額)
    let costPrice = 0;
    quotations.forEach(quote => {
      if (quote.total) {
        costPrice = calculate.add(costPrice, quote.total);
      }
    });
    // 吊船quote也計入成本價
    shipQuotations.forEach(shipQuote => {
      if (shipQuote.total) {
        costPrice = calculate.add(costPrice, shipQuote.total);
      }
    });

    // 計算S_price (supplier quotations總額)
    let sPrice = 0;
    supplierQuotations.forEach(supplierQuote => {
      if (supplierQuote.total) {
        sPrice = calculate.add(sPrice, supplierQuote.total);
      }
    });

    // 處理判頭費：支持新的 contractorFees 數組格式，也支持舊的 contractorFee 單一值（向後兼容）
    let totalContractorFee = 0;
    let contractorFeesArray = [];
    
    if (contractorFees && Array.isArray(contractorFees) && contractorFees.length > 0) {
      // 新格式：contractorFees 數組
      contractorFeesArray = contractorFees.filter(fee => fee && fee.projectName && fee.amount !== undefined);
      totalContractorFee = contractorFeesArray.reduce((sum, fee) => {
        return calculate.add(sum, fee.amount || 0);
      }, 0);
    } else if (contractorFee !== undefined && contractorFee !== null) {
      // 舊格式：單一 contractorFee 值（向後兼容）
      totalContractorFee = contractorFee || 0;
      if (totalContractorFee > 0) {
        // 將舊的單一值轉換為數組格式
        contractorFeesArray = [{
          projectName: '判頭費',
          amount: totalContractorFee,
        }];
      }
    }

    // 計算毛利 = 成本價 - S_price - 判頭費總額
    const grossProfit = calculate.sub(calculate.sub(costPrice, sPrice), totalContractorFee);

    // 收集所有相關的供應商（從quotations和supplier quotations）
    const supplierIds = new Set();
    
    quotations.forEach(quote => {
      if (quote.clients) {
        quote.clients.forEach(client => {
          if (client._id) {
            supplierIds.add(client._id.toString());
          }
        });
      }
    });

    supplierQuotations.forEach(supplierQuote => {
      if (supplierQuote.clients) {
        supplierQuote.clients.forEach(client => {
          if (client._id) {
            supplierIds.add(client._id.toString());
          }
        });
      }
    });

    shipQuotations.forEach(shipQuote => {
      if (shipQuote.clients) {
        shipQuote.clients.forEach(client => {
          if (client._id) {
            supplierIds.add(client._id.toString());
          }
        });
      }
    });

    // 創建項目數據
    const projectData = {
      name: projectName,
      invoiceNumber,
      poNumber: poNumber || '',
      costBy,
      contractorFees: contractorFeesArray,
      description,
      address,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      quotations: quotations.map(q => q._id),
      supplierQuotations: supplierQuotations.map(sq => sq._id),
      shipQuotations: shipQuotations.map(sq => sq._id),
      invoices: invoices.map(i => i._id),
      suppliers: Array.from(supplierIds),
      contractors: contractors || [],
      costPrice,
      sPrice,
      grossProfit,
      createdBy: req.admin._id,
    };

    // 創建項目
    const project = await new Project(projectData).save();

    // 更新相關的quotations，添加project關聯
    // 使用相同的查找邏輯來更新
    await Quote.updateMany(findQuery, { project: project._id });
    await SupplierQuote.updateMany(findQuery, { project: project._id });
    await ShipQuote.updateMany(findQuery, { project: project._id });
    await Invoice.updateMany(findQuery, { project: project._id });

    // 重新查詢項目以獲取完整的populated數據
    const populatedProject = await Project.findById(project._id);

    return res.status(200).json({
      success: true,
      result: populatedProject,
      message: `Project created successfully. Linked ${quotations.length} quotations, ${supplierQuotations.length} supplier quotations, ${shipQuotations.length} ship quotations, and ${invoices.length} invoices.`,
    });

  } catch (error) {
    console.error('創建項目失敗:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating project: ' + error.message,
    });
  }
};

module.exports = create;
