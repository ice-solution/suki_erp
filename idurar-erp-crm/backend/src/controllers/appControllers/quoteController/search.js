const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

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

  const searchTerm = req.query.q.trim();
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['address', 'invoiceNumber'];

  const fields = { $or: [] };

  // 脫逸正則特殊字元，供子字串匹配使用
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 完整 Quote Number 子字串匹配：例如 "400" 可匹配 QU-400、SML-4000（不需順序、不需完整）
  const escapedSubstring = escapeRegex(searchTerm);
  fields.$or.push({
    $expr: {
      $regexMatch: {
        input: { $concat: [{ $ifNull: ['$numberPrefix', ''] }, '-', { $toString: '$number' }] },
        regex: escapedSubstring,
        options: 'i',
      },
    },
  });

  // 標準字段搜索
  for (const field of fieldsArray) {
    if (field === 'number') {
      const numberValue = parseInt(searchTerm);
      if (!isNaN(numberValue)) {
        fields.$or.push({ [field]: numberValue });
      }
    } else if (field !== 'status') {
      fields.$or.push({ [field]: { $regex: new RegExp(escapeRegex(searchTerm), 'i') } });
    }
  }

  // 特殊處理：搜索完整的Quote號碼 (Quote Type-number)
  if (searchTerm.includes('-')) {
    const [quoteTypePart, numberPart] = searchTerm.split('-');
    const numberValue = parseInt(numberPart);
    
    if (quoteTypePart && !isNaN(numberValue)) {
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: new RegExp(escapeRegex(quoteTypePart), 'i') } },
          { number: numberValue },
        ],
      });
      fields.$or.push({
        $and: [
          { type: { $regex: new RegExp(escapeRegex(quoteTypePart), 'i') } },
          { number: numberValue },
        ],
      });
    }
  } else {
    fields.$or.push({ numberPrefix: { $regex: new RegExp(escapedSubstring, 'i') } });
    fields.$or.push({ type: { $regex: new RegExp(escapedSubstring, 'i') } });
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
