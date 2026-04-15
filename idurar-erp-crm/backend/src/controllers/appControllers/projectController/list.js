const mongoose = require('mongoose');

const Model = mongoose.model('Project');

const list = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  //  Query the database for a list of all results
  const resultsPromise = Model.find({
    removed: false,
  })
    .skip(skip)
    .limit(limit)
    // Project list 預設依 Quote Number（Project.invoiceNumber）倒序
    .sort({ invoiceNumber: -1, created: -1 })
    .populate('createdBy', 'name')
    .populate('suppliers', 'name')
    .populate('contractors', 'name')
    .populate({
      path: 'quotations',
      select: 'numberPrefix number year total status isCompleted'
    })
    .populate({
      path: 'supplierQuotations', 
      select: 'numberPrefix number year total status isCompleted'
    })
    .populate({
      path: 'shipQuotations', 
      select: 'numberPrefix number year total status isCompleted'
    })
    .populate({
      path: 'invoices',
      // 需要 invoiceNumber 用於 Project list 第一欄顯示
      // numberPrefix/number 也一併取回，以防 invoiceNumber 欄位未填
      select: 'invoiceNumber numberPrefix number year total status'
    });

  // Counting the total documents
  const countPromise = Model.countDocuments({ removed: false });

  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);

  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };
  if (count > 0) {
    return res.status(200).json({
      success: true,
      result: { items: result },
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: { items: [] },
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = list;
