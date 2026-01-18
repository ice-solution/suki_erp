const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

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

  const searchTerm = req.query.q;
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['name'];

  const fields = { $or: [] };

  // 標準字段搜索
  for (const field of fieldsArray) {
    if (field === 'number') {
      // 對於number字段，嘗試數字匹配
      const numberValue = parseInt(searchTerm);
      if (!isNaN(numberValue)) {
        fields.$or.push({ [field]: numberValue });
      }
    } else {
      // 對於其他字段，使用正則表達式搜索
      fields.$or.push({ [field]: { $regex: new RegExp(searchTerm, 'i') } });
    }
  }

  // 特殊處理：搜索完整的SupplierQuote號碼 (numberPrefix-number)
  // 如果搜索詞包含"-"，嘗試分離numberPrefix和number
  if (searchTerm.includes('-')) {
    const [prefixPart, numberPart] = searchTerm.split('-');
    const numberValue = parseInt(numberPart);
    
    if (prefixPart && !isNaN(numberValue)) {
      // 優先匹配 numberPrefix + number
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(prefixPart, 'i') } },
          { number: numberValue }
        ]
      });
    }
  } else {
    // 如果沒有"-"，優先匹配 numberPrefix
    fields.$or.push({ numberPrefix: { $regex: new RegExp(searchTerm, 'i') } });
    
    // 如果是數字，也嘗試匹配number字段
    const numberValue = parseInt(searchTerm);
    if (!isNaN(numberValue)) {
      fields.$or.push({ number: numberValue });
    }
  }

  try {
    let results = await Model.find(fields)
      .where({ removed: false })
      .sort({ created: -1 })
      .limit(50)
      .populate('createdBy', 'name')
      .populate('clients', 'name')
      .populate('client', 'name');

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
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }
};

module.exports = search;
