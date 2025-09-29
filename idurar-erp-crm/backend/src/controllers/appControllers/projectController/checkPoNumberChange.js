const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const Invoice = mongoose.model('Invoice');

const checkPoNumberChange = async (req, res) => {
  try {
    const { projectId, newPoNumber } = req.query;

    if (!projectId || !newPoNumber) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and new P.O Number are required'
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

    const oldPoNumber = existingProject.poNumber;
    
    // 如果 P.O Number 沒有改變，返回空結果
    if (oldPoNumber === newPoNumber) {
      return res.status(200).json({
        success: true,
        poNumberChanged: false,
        message: 'P.O Number unchanged'
      });
    }

    // 查找相關的記錄
    const [quotes, supplierQuotes, invoices] = await Promise.all([
      Quote.find({ poNumber: oldPoNumber, removed: false }).select('number date status').lean(),
      SupplierQuote.find({ poNumber: oldPoNumber, removed: false }).select('number date status').lean(),
      Invoice.find({ poNumber: oldPoNumber, removed: false }).select('number date status').lean()
    ]);

    return res.status(200).json({
      success: true,
      poNumberChanged: true,
      oldPoNumber,
      newPoNumber,
      affectedRecords: {
        quotes: {
          count: quotes.length,
          records: quotes.map(q => ({
            number: q.number,
            date: q.date,
            status: q.status
          }))
        },
        supplierQuotes: {
          count: supplierQuotes.length,
          records: supplierQuotes.map(sq => ({
            number: sq.number,
            date: sq.date,
            status: sq.status
          }))
        },
        invoices: {
          count: invoices.length,
          records: invoices.map(i => ({
            number: i.number,
            date: i.date,
            status: i.status
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error checking P.O Number change:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking P.O Number change: ' + error.message
    });
  }
};

module.exports = checkPoNumberChange;
