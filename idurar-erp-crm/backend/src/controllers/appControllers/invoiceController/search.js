const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

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
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['address', 'invoiceNumber'];

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

  // 特殊處理：搜索完整的Invoice號碼 (Quote Type-number)
  // 如果搜索詞包含"-"，嘗試分離Quote Type和number
  if (searchTerm.includes('-')) {
    const [quoteTypePart, numberPart] = searchTerm.split('-');
    const numberValue = parseInt(numberPart);
    
    if (quoteTypePart && !isNaN(numberValue)) {
      // 優先匹配 Quote Type (numberPrefix) + number
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(quoteTypePart, 'i') } },
          { number: numberValue }
        ]
      });
      // 向後兼容：也嘗試匹配 type (服務類型) + number
      fields.$or.push({
        $and: [
          { type: { $regex: new RegExp(quoteTypePart, 'i') } },
          { number: numberValue }
        ]
      });
    }
  } else {
    // 如果沒有"-"，優先匹配 Quote Type (numberPrefix)
    fields.$or.push({ numberPrefix: { $regex: new RegExp(searchTerm, 'i') } });
    
    // 向後兼容：也嘗試匹配 type (服務類型)
    fields.$or.push({ type: { $regex: new RegExp(searchTerm, 'i') } });
    
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

