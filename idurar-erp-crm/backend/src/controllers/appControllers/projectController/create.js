const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const Invoice = mongoose.model('Invoice');

const { calculate } = require('@/helpers');

const create = async (req, res) => {
  try {
    const { poNumber, costBy, contractorFee = 0, description, address, startDate, endDate, contractors = [] } = req.body;

    if (!poNumber) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'P.O Number is required',
      });
    }

    // 檢查是否已存在相同P.O Number的項目
    const existingProject = await Project.findOne({ poNumber, removed: false });
    if (existingProject) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project with this P.O Number already exists',
      });
    }

    // 根據P.O Number查找相關的quotations
    const quotations = await Quote.find({ poNumber, removed: false });
    const supplierQuotations = await SupplierQuote.find({ poNumber, removed: false });
    const invoices = await Invoice.find({ poNumber, removed: false });

    console.log(`找到 ${quotations.length} 個quotations, ${supplierQuotations.length} 個supplier quotations, ${invoices.length} 個invoices`);

    // 計算成本價 (quotations總額)
    let costPrice = 0;
    quotations.forEach(quote => {
      if (quote.total) {
        costPrice = calculate.add(costPrice, quote.total);
      }
    });

    // 計算S_price (supplier quotations總額)
    let sPrice = 0;
    supplierQuotations.forEach(supplierQuote => {
      if (supplierQuote.total) {
        sPrice = calculate.add(sPrice, supplierQuote.total);
      }
    });

    // 計算毛利 = 成本價 - S_price - 判頭費
    const grossProfit = calculate.sub(calculate.sub(costPrice, sPrice), contractorFee);

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

    // 創建項目數據
    const projectData = {
      poNumber,
      costBy,
      contractorFee,
      description,
      address,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      quotations: quotations.map(q => q._id),
      supplierQuotations: supplierQuotations.map(sq => sq._id),
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
    await Quote.updateMany(
      { poNumber, removed: false },
      { project: project._id }
    );

    await SupplierQuote.updateMany(
      { poNumber, removed: false },
      { project: project._id }
    );

    await Invoice.updateMany(
      { poNumber, removed: false },
      { project: project._id }
    );

    // 重新查詢項目以獲取完整的populated數據
    const populatedProject = await Project.findById(project._id);

    return res.status(200).json({
      success: true,
      result: populatedProject,
      message: `Project created successfully. Linked ${quotations.length} quotations, ${supplierQuotations.length} supplier quotations, and ${invoices.length} invoices.`,
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
