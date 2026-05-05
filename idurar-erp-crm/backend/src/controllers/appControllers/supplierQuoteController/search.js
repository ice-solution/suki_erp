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

  try {
    const searchTerm = req.query.q;
    const fieldsArray = req.query.fields ? req.query.fields.split(',').map((f) => f.trim()).filter(Boolean) : [];

    const fields = { $or: [] };
    const regex = substringRegex(searchTerm);

    // PO Number、Address、Client 名字 搜索（任意位置包含搜尋詞，例如 1032 可匹配 PO1032）
    fields.$or.push({ poNumber: { $regex: regex } });
    fields.$or.push({ address: { $regex: regex } });

    // Client 名字搜尋：若 Client collection / query 有問題也不應該直接炸掉
    const ClientModel = mongoose.model('Client');
    const matchingClients = await ClientModel.find({ name: { $regex: regex }, removed: false }).distinct('_id');
    if (matchingClients && matchingClients.length > 0) {
      fields.$or.push({ clients: { $in: matchingClients } });
      fields.$or.push({ client: { $in: matchingClients } });
    }

    // 標準字段搜索（若傳入 fields）
    // 只對 String 欄位使用 regex；Number 欄位僅在可 parse 時做等值；Date 欄位若無法 parse 則跳過
    for (const field of fieldsArray) {
      if (!field || ['poNumber', 'address'].includes(field)) continue;

      const schemaPath = Model.schema.path(field);
      const instance = schemaPath && schemaPath.instance ? schemaPath.instance : null;

      if (field === 'number' || instance === 'Number') {
        const numberValue = parseInt(searchTerm, 10);
        if (!Number.isNaN(numberValue)) {
          fields.$or.push({ [field]: numberValue });
        }
        continue;
      }

      if (instance === 'String') {
        fields.$or.push({ [field]: { $regex: regex } });
        continue;
      }

      // Date / 其他型別：避免用 $regex 造成 Mongo error
      // 若未來需要支援日期搜尋，再在此加上對應解析（例如 dd/mm/yyyy）
    }

    // 特殊處理：搜索完整的 SupplierQuote 號碼 (numberPrefix-number)
    // 如果搜索詞包含 "-"，嘗試分離 numberPrefix 和 number
    if (searchTerm.includes('-')) {
      const [prefixPart, numberPart] = searchTerm.split('-');
      const numberValue = parseInt(numberPart, 10);

      if (prefixPart && !Number.isNaN(numberValue)) {
        fields.$or.push({
          $and: [{ numberPrefix: { $regex: substringRegex(prefixPart) } }, { number: numberValue }],
        });
      }
    } else {
      // 任意位置包含搜尋詞（例如 1032 可匹配 PO1032、S-1032 等）
      fields.$or.push({ numberPrefix: { $regex: regex } });

      const numberValue = parseInt(searchTerm, 10);
      if (!Number.isNaN(numberValue)) {
        fields.$or.push({ number: numberValue });
      }
    }

    let results = await Model.find(fields)
      .where({ removed: false })
      .sort({ created: -1 })
      .limit(50)
      .populate('createdBy', 'name')
      .populate('clients', 'name')
      .populate('client', 'name')
      .populate('supplier', 'name');

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
    console.error('SupplierQuote search error:', error);
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }
};

module.exports = search;
