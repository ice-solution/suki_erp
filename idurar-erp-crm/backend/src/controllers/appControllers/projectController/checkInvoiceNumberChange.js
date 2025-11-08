const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const Invoice = mongoose.model('Invoice');

const checkInvoiceNumberChange = async (req, res) => {
  try {
    const { projectId, newInvoiceNumber } = req.query;

    if (!projectId || !newInvoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and new Invoice Number are required'
      });
    }

    // 查找現有項目
    const existingProject = await Project.findOne({ _id: projectId, removed: false });
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const oldInvoiceNumber = existingProject.invoiceNumber;
    
    // 如果 Invoice Number 沒有改變，返回空結果
    if (oldInvoiceNumber === newInvoiceNumber) {
      return res.status(200).json({
        success: true,
        invoiceNumberChanged: false,
        message: 'Invoice Number unchanged'
      });
    }

    // 查找相關的記錄
    const [quotes, supplierQuotes, invoices] = await Promise.all([
      Quote.find({ invoiceNumber: oldInvoiceNumber, removed: false }).select('number date status type').lean(),
      SupplierQuote.find({ invoiceNumber: oldInvoiceNumber, removed: false }).select('number date status type').lean(),
      Invoice.find({ invoiceNumber: oldInvoiceNumber, removed: false }).select('number date status type').lean()
    ]);

    return res.status(200).json({
      success: true,
      invoiceNumberChanged: true,
      oldInvoiceNumber,
      newInvoiceNumber,
      affectedRecords: {
        quotes: {
          count: quotes.length,
          records: quotes.map(q => ({
            number: q.number,
            date: q.date,
            status: q.status,
            type: q.type
          }))
        },
        supplierQuotes: {
          count: supplierQuotes.length,
          records: supplierQuotes.map(sq => ({
            number: sq.number,
            date: sq.date,
            status: sq.status,
            type: sq.type
          }))
        },
        invoices: {
          count: invoices.length,
          records: invoices.map(i => ({
            number: i.number,
            date: i.date,
            status: i.status,
            type: i.type
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error checking Invoice Number change:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking Invoice Number change: ' + error.message
    });
  }
};

module.exports = checkInvoiceNumberChange;

