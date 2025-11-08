const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
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
    const [quotations, supplierQuotations, invoices] = await Promise.all([
      Quote.find({ invoiceNumber, removed: false }),
      SupplierQuote.find({ invoiceNumber, removed: false }),
      Invoice.find({ invoiceNumber, removed: false })
    ]);

    // 找出新的文檔（還沒關聯到項目的）
    const currentQuotationIds = project.quotations.map(q => q._id?.toString() || q.toString());
    const currentSupplierQuotationIds = project.supplierQuotations.map(sq => sq._id?.toString() || sq.toString());
    const currentInvoiceIds = project.invoices.map(inv => inv._id?.toString() || inv.toString());

    const newQuotations = quotations.filter(q => !currentQuotationIds.includes(q._id.toString()));
    const newSupplierQuotations = supplierQuotations.filter(sq => !currentSupplierQuotationIds.includes(sq._id.toString()));
    const newInvoices = invoices.filter(inv => !currentInvoiceIds.includes(inv._id.toString()));

    // 收集所有供應商
    const allSuppliers = new Set();
    [...quotations, ...supplierQuotations, ...invoices].forEach(doc => {
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

    let sPrice = 0;
    supplierQuotations.forEach(sq => {
      sPrice = calculate.add(sPrice, sq.total || 0);
    });

    const grossProfit = calculate.sub(calculate.sub(costPrice, sPrice), project.contractorFee || 0);

    // 更新項目
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        quotations: quotations.map(q => q._id),
        supplierQuotations: supplierQuotations.map(sq => sq._id),
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
     .populate('invoices')
     .populate('suppliers');

    // 更新所有相關文檔，添加項目引用
    await Promise.all([
      Quote.updateMany({ invoiceNumber, removed: false }, { project: id }),
      SupplierQuote.updateMany({ invoiceNumber, removed: false }, { project: id }),
      Invoice.updateMany({ invoiceNumber, removed: false }, { project: id })
    ]);

    // 返回同步結果
    return res.status(200).json({
      success: true,
      result: updatedProject,
      syncSummary: {
        newQuotations: newQuotations.length,
        newSupplierQuotations: newSupplierQuotations.length,
        newInvoices: newInvoices.length,
        totalQuotations: quotations.length,
        totalSupplierQuotations: supplierQuotations.length,
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
