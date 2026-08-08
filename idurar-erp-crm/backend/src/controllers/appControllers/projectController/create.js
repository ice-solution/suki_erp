const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const ShipQuote = mongoose.model('ShipQuote');
const Invoice = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { ensureContractorFeeLineIds } = require('@/helpers/projectContractorFees');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildQuoteNumberFindQuery(invoiceNumber) {
  const trimmed = String(invoiceNumber || '').trim();
  let numberPrefix = null;
  let number = null;
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length >= 2) {
      numberPrefix = parts[0];
      number = parts.slice(1).join('-');
    }
  }

  const findQuery = {
    $or: [{ invoiceNumber: trimmed, removed: false }],
  };

  if (numberPrefix && number) {
    findQuery.$or.push({
      numberPrefix,
      number,
      removed: false,
    });
    // 容許 prefix 大小寫差異（sml-12345 / SML-12345）
    findQuery.$or.push({
      numberPrefix: new RegExp(`^${escapeRegex(numberPrefix)}$`, 'i'),
      number,
      removed: false,
    });
  }

  return { trimmed, findQuery };
}

const create = async (req, res) => {
  try {
    const {
      invoiceNumber,
      customerName,
      client,
      customerQuoteNumber,
      poNumber,
      costBy,
      contractorFees = [],
      contractorFee,
      description,
      address,
      startDate,
      endDate,
      contractors = [],
      name,
      status,
    } = req.body;

    if (!invoiceNumber || !String(invoiceNumber).trim()) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invoice Number is required',
      });
    }

    const { trimmed, findQuery } = buildQuoteNumberFindQuery(invoiceNumber);

    // 1) Quote Number 是否已開過 Project
    const existingProject = await Project.findOne({
      removed: false,
      $or: [
        { invoiceNumber: trimmed },
        { invoiceNumber: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
      ],
    })
      .select('_id invoiceNumber name')
      .lean();

    if (existingProject) {
      return res.status(400).json({
        success: false,
        result: existingProject,
        message: `項目已建立（${existingProject.invoiceNumber || trimmed}）`,
      });
    }

    // 2) 報價單是否存在（Quote 或吊船 ShipQuote）
    const quotations = await Quote.find(findQuery);
    const shipQuotations = await ShipQuote.find(findQuery);

    if (quotations.length === 0 && shipQuotations.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `報價單不存在（${trimmed}）`,
      });
    }

    const supplierQuotations = await SupplierQuote.find(findQuery);
    const invoices = await Invoice.find(findQuery);

    // 預設專案名稱
    const projectName = name || trimmed;

    console.log(
      `找到 ${quotations.length} 個quotations, ${supplierQuotations.length} 個supplier quotations, ${shipQuotations.length} 個ship quotations, ${invoices.length} 個invoices`
    );

    // 計算成本價 (優先使用 quotations 的 costPrice，如果沒有則使用 total)
    let costPrice = 0;
    quotations.forEach((quote) => {
      const price =
        quote.costPrice !== undefined && quote.costPrice !== null
          ? quote.costPrice
          : quote.total || 0;
      costPrice = calculate.add(costPrice, price);
    });
    // 吊船quote也計入成本價（優先使用 costPrice，如果沒有則使用 total）
    shipQuotations.forEach((shipQuote) => {
      const price =
        shipQuote.costPrice !== undefined && shipQuote.costPrice !== null
          ? shipQuote.costPrice
          : shipQuote.total || 0;
      costPrice = calculate.add(costPrice, price);
    });

    // 計算S_price (supplier quotations總額)
    let sPrice = 0;
    supplierQuotations.forEach((supplierQuote) => {
      if (supplierQuote.total) {
        sPrice = calculate.add(sPrice, supplierQuote.total);
      }
    });

    // 處理判頭費：支持新的 contractorFees 數組格式，也支持舊的 contractorFee 單一值（向後兼容）
    let totalContractorFee = 0;
    let contractorFeesArray = [];

    if (contractorFees && Array.isArray(contractorFees) && contractorFees.length > 0) {
      contractorFeesArray = ensureContractorFeeLineIds(
        contractorFees.filter((fee) => fee && fee.projectName && fee.amount !== undefined)
      );
      totalContractorFee = contractorFeesArray.reduce((sum, fee) => {
        return calculate.add(sum, fee.amount || 0);
      }, 0);
    } else if (contractorFee !== undefined && contractorFee !== null) {
      // 舊格式：單一 contractorFee 值（向後兼容）
      totalContractorFee = contractorFee || 0;
      if (totalContractorFee > 0) {
        contractorFeesArray = ensureContractorFeeLineIds([
          { projectName: '判頭費', amount: totalContractorFee },
        ]);
      }
    }

    // 計算毛利 = 成本價 - S_price - 判頭費總額
    const grossProfit = calculate.sub(calculate.sub(costPrice, sPrice), totalContractorFee);

    // 收集所有相關的供應商（從quotations和supplier quotations）
    const supplierIds = new Set();

    quotations.forEach((quote) => {
      if (quote.clients) {
        quote.clients.forEach((client) => {
          if (client._id) {
            supplierIds.add(client._id.toString());
          }
        });
      }
    });

    supplierQuotations.forEach((supplierQuote) => {
      if (supplierQuote.clients) {
        supplierQuote.clients.forEach((client) => {
          if (client._id) {
            supplierIds.add(client._id.toString());
          }
        });
      }
    });

    shipQuotations.forEach((shipQuote) => {
      if (shipQuote.clients) {
        shipQuote.clients.forEach((client) => {
          if (client._id) {
            supplierIds.add(client._id.toString());
          }
        });
      }
    });

    // 創建項目數據
    const projectData = {
      name: projectName,
      invoiceNumber: trimmed,
      customerName: customerName != null ? String(customerName).trim() : '',
      client: client || undefined,
      customerQuoteNumber:
        customerQuoteNumber != null ? String(customerQuoteNumber).trim() : '',
      poNumber: poNumber || '',
      costBy,
      contractorFees: contractorFeesArray,
      description,
      address,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      quotations: quotations.map((q) => q._id),
      supplierQuotations: supplierQuotations.map((sq) => sq._id),
      shipQuotations: shipQuotations.map((sq) => sq._id),
      invoices: invoices.map((i) => i._id),
      suppliers: Array.from(supplierIds),
      contractors: contractors || [],
      costPrice,
      sPrice,
      grossProfit,
      createdBy: req.admin._id,
      ...(status != null && String(status).trim() !== ''
        ? { status: String(status).trim() }
        : {}),
    };

    // 創建項目
    const project = await new Project(projectData).save();

    // 更新相關的quotations，添加project關聯
    await Quote.updateMany(findQuery, { project: project._id });
    await SupplierQuote.updateMany(findQuery, { project: project._id });
    await ShipQuote.updateMany(findQuery, { project: project._id });
    await Invoice.updateMany(findQuery, { project: project._id });

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
