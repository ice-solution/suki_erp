const mongoose = require('mongoose');

const Model = mongoose.model('Project');
const QuoteModel = mongoose.model('Quote');
const InvoiceModel = mongoose.model('Invoice');
const ShipQuoteModel = mongoose.model('ShipQuote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');

const search = async (req, res) => {
  if (req.query.q === undefined || req.query.q === '' || req.query.q === ' ') {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found',
      })
      .end();
  }

  const fieldsArray = (req.query.fields || '').split(',').filter(Boolean);

  const fields = { $or: [] };

  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
  }
  
  try {
    // 1) 先用 Project 自身欄位搜尋（invoiceNumber/name/address/EO number 等）
    let results = await Model.find(fields.$or.length ? fields : {})
      .where({ removed: false })
      .sort({ invoiceNumber: 1 })
      .limit(10)
      .populate('suppliers', 'name')
      .populate({
        path: 'quotations',
        select: 'numberPrefix number year total status isCompleted',
      })
      .populate({
        path: 'invoices',
        select: 'invoiceNumber numberPrefix number year total status',
      })
      .populate({
        path: 'shipQuotations',
        select: 'numberPrefix number year total status isCompleted',
      });

    // 2) 若 Project 自身欄位找不到或不足，再用關聯單據號碼反查 Project
    if (results.length < 10) {
      const q = String(req.query.q || '').trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const docHits = await Promise.all([
        QuoteModel.find({ removed: false, $or: [{ invoiceNumber: { $regex: regex } }, { number: { $regex: regex } }] })
          .select('project')
          .limit(10)
          .lean(),
        ShipQuoteModel.find({ removed: false, $or: [{ invoiceNumber: { $regex: regex } }, { number: { $regex: regex } }] })
          .select('project')
          .limit(10)
          .lean(),
        InvoiceModel.find({ removed: false, $or: [{ invoiceNumber: { $regex: regex } }, { number: { $regex: regex } }] })
          .select('project')
          .limit(10)
          .lean(),
        SupplierQuoteModel.find({ removed: false, $or: [{ invoiceNumber: { $regex: regex } }, { number: { $regex: regex } }] })
          .select('project')
          .limit(10)
          .lean(),
      ]);

      const projectIds = Array.from(
        new Set(
          docHits
            .flat()
            .map((d) => d && d.project)
            .filter(Boolean)
            .map((id) => String(id))
        )
      );

      if (projectIds.length) {
        const existing = new Set(results.map((p) => String(p._id)));
        const missingIds = projectIds.filter((id) => !existing.has(id));
        if (missingIds.length) {
          const more = await Model.find({ removed: false, _id: { $in: missingIds } })
            .sort({ invoiceNumber: 1 })
            .limit(10 - results.length)
            .populate('suppliers', 'name')
            .populate({
              path: 'quotations',
              select: 'numberPrefix number year total status isCompleted',
            })
            .populate({
              path: 'invoices',
              select: 'invoiceNumber numberPrefix number year total status',
            })
            .populate({
              path: 'shipQuotations',
              select: 'numberPrefix number year total status isCompleted',
            });
          results = results.concat(more);
        }
      }
    }

    if (results.length >= 1) {
      return res.status(200).json({
        success: true,
        result: results,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'No document found',
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }
};

module.exports = search;
