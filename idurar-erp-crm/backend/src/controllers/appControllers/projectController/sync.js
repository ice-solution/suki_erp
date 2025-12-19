const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const ShipQuote = mongoose.model('ShipQuote');
const Invoice = mongoose.model('Invoice');
const { calculate } = require('@/helpers');

const sync = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找項目
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const { invoiceNumber } = project;
    
    // 查找所有相同 Invoice Number 的文檔
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

    const [quotations, supplierQuotations, shipQuotations, invoices] = await Promise.all([
      Quote.find(findQuery),
      SupplierQuote.find(findQuery),
      ShipQuote.find(findQuery),
      Invoice.find(findQuery)
    ]);

    // 找出新的文檔（還沒關聯到項目的）
    const currentQuotationIds = project.quotations.map(q => q._id?.toString() || q.toString());
    const currentSupplierQuotationIds = project.supplierQuotations.map(sq => sq._id?.toString() || sq.toString());
    const currentShipQuotationIds = (project.shipQuotations || []).map(sq => sq._id?.toString() || sq.toString());
    const currentInvoiceIds = project.invoices.map(inv => inv._id?.toString() || inv.toString());

    const newQuotations = quotations.filter(q => !currentQuotationIds.includes(q._id.toString()));
    const newSupplierQuotations = supplierQuotations.filter(sq => !currentSupplierQuotationIds.includes(sq._id.toString()));
    const newShipQuotations = shipQuotations.filter(sq => !currentShipQuotationIds.includes(sq._id.toString()));
    const newInvoices = invoices.filter(inv => !currentInvoiceIds.includes(inv._id.toString()));

    // 收集所有供應商
    const allSuppliers = new Set();
    [...quotations, ...supplierQuotations, ...shipQuotations, ...invoices].forEach(doc => {
      if (doc.clients && Array.isArray(doc.clients)) {
        doc.clients.forEach(client => {
          if (client._id) allSuppliers.add(client._id.toString());
        });
      } else if (doc.client && doc.client._id) {
        allSuppliers.add(doc.client._id.toString());
      }
    });

    // 重新計算財務數據
    let costPrice = 0;
    quotations.forEach(q => {
      costPrice = calculate.add(costPrice, q.total || 0);
    });
    // 吊船quote也計入成本價
    shipQuotations.forEach(sq => {
      costPrice = calculate.add(costPrice, sq.total || 0);
    });

    let sPrice = 0;
    supplierQuotations.forEach(sq => {
      sPrice = calculate.add(sPrice, sq.total || 0);
    });

    // 計算總判頭費（支持新的 contractorFees 數組格式和舊的 contractorFee 單一值）
    let totalContractorFee = 0;
    if (project.contractorFees && Array.isArray(project.contractorFees)) {
      // 新格式：contractorFees 數組
      totalContractorFee = project.contractorFees.reduce((sum, fee) => {
        return calculate.add(sum, fee.amount || 0);
      }, 0);
    } else if (project.contractorFee !== undefined) {
      // 舊格式：單一 contractorFee 值（向後兼容）
      totalContractorFee = project.contractorFee || 0;
    }
    
    const grossProfit = calculate.sub(calculate.sub(costPrice, sPrice), totalContractorFee);

    // 更新項目
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        quotations: quotations.map(q => q._id),
        supplierQuotations: supplierQuotations.map(sq => sq._id),
        shipQuotations: shipQuotations.map(sq => sq._id),
        invoices: invoices.map(inv => inv._id),
        suppliers: Array.from(allSuppliers),
        costPrice,
        sPrice,
        grossProfit,
        updated: new Date(),
      },
      { new: true }
    ).populate('quotations')
     .populate('supplierQuotations')
     .populate('shipQuotations')
     .populate('invoices')
     .populate('suppliers');

    // 更新所有相關文檔，添加項目引用
    // 使用相同的查找邏輯來更新
    await Promise.all([
      Quote.updateMany(findQuery, { project: id }),
      SupplierQuote.updateMany(findQuery, { project: id }),
      ShipQuote.updateMany(findQuery, { project: id }),
      Invoice.updateMany(findQuery, { project: id })
    ]);

    // 返回同步結果
    return res.status(200).json({
      success: true,
      result: updatedProject,
      syncSummary: {
        newQuotations: newQuotations.length,
        newSupplierQuotations: newSupplierQuotations.length,
        newShipQuotations: newShipQuotations.length,
        newInvoices: newInvoices.length,
        totalQuotations: quotations.length,
        totalSupplierQuotations: supplierQuotations.length,
        totalShipQuotations: shipQuotations.length,
        totalInvoices: invoices.length,
        updatedFinancials: {
          costPrice,
          sPrice,
          grossProfit
        }
      },
      message: `Successfully synced project with Invoice Number ${invoiceNumber}`,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error syncing project',
      error: error.message,
    });
  }
};

module.exports = sync;
