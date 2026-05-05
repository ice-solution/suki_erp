const search = async (Model, req, res) => {
  // console.log(req.query.fields)
  // if (req.query.q === undefined || req.query.q.trim() === '') {
  //   return res
  //     .status(202)
  //     .json({
  //       success: false,
  //       result: [],
  //       message: 'No document found by this request',
  //     })
  //     .end();
  // }
  const fieldsArray = req.query.fields
    ? String(req.query.fields)
        .split(',')
        .map((f) => String(f || '').trim())
        .filter(Boolean)
    : ['name'];
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found by this request',
    });
  }

  const fields = { $or: [] };

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  for (const field of fieldsArray) {
    if (!field) continue;
    const schemaPath = Model?.schema?.path?.(field);
    const instance = schemaPath && schemaPath.instance ? schemaPath.instance : null;

    // 只對 String 欄位使用 $regex，避免 Date/Number/Boolean/Array/ObjectId 等型別噴 Mongo error
    if (instance === 'String' || instance == null) {
      fields.$or.push({ [field]: { $regex: regex } });
      continue;
    }

    // Number：若 q 可 parse，做等值比對
    if (instance === 'Number') {
      const n = parseInt(q, 10);
      if (!Number.isNaN(n)) {
        fields.$or.push({ [field]: n });
      }
      continue;
    }

    // 其他型別：先跳過（如 Date/ObjectId/Boolean/Array）
  }
  // console.log(fields)

  let results;
  try {
    results = await Model.find({
      ...fields,
    })
      .where('removed', false)
      .limit(20)
      .exec();
  } catch (err) {
    console.error('CRUD search error:', err);
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found by this request',
      })
      .end();
  }
};

module.exports = search;
