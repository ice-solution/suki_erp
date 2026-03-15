const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

// 將搜尋詞轉為「任意位置包含」的 regex，並跳脫特殊字元，使 1032 可匹配 PO1032
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function substringRegex(searchTerm) {
  return new RegExp(escapeRegex(searchTerm), 'i');
}

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
  const fieldsArray = req.query.fields ? req.query.fields.split(',').map((f) => f.trim()) : [];

  const fields = { $or: [] };
  const regex = substringRegex(searchTerm);

  // PO Number、Address、Client 名字 搜索（任意位置包含搜尋詞，例如 1032 可匹配 PO1032）
  fields.$or.push({ poNumber: { $regex: regex } });
  fields.$or.push({ address: { $regex: regex } });

  const ClientModel = mongoose.model('Client');
  const matchingClients = await ClientModel.find({ name: { $regex: regex }, removed: false }).distinct('_id');
  if (matchingClients && matchingClients.length > 0) {
    fields.$or.push({ clients: { $in: matchingClients } });
    fields.$or.push({ client: { $in: matchingClients } });
  }

  // 標準字段搜索（若傳入 fields）
  for (const field of fieldsArray) {
    if (field === 'number') {
      const numberValue = parseInt(searchTerm);
      if (!isNaN(numberValue)) {
        fields.$or.push({ [field]: numberValue });
      }
    } else if (field && !['poNumber', 'address'].includes(field)) {
      fields.$or.push({ [field]: { $regex: regex } });
    }
  }

  // 特殊處理：搜索完整的SupplierQuote號碼 (numberPrefix-number)
  // 如果搜索詞包含"-"，嘗試分離numberPrefix和number
  if (searchTerm.includes('-')) {
    const [prefixPart, numberPart] = searchTerm.split('-');
    const numberValue = parseInt(numberPart);
    
    if (prefixPart && !isNaN(numberValue)) {
      fields.$or.push({
        $and: [
          { numberPrefix: { $regex: substringRegex(prefixPart) } },
          { number: numberValue }
        ]
      });
    }
  } else {
    // 任意位置包含搜尋詞（例如 1032 可匹配 PO1032、S-1032 等）
    fields.$or.push({ numberPrefix: { $regex: regex } });
    
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
