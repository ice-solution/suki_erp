const mongoose = require('mongoose');

const ENTITY_CONFIG = {
  quote: { modelName: 'Quote' },
  shipquote: { modelName: 'ShipQuote', extraMatch: { type: '吊船' } },
  supplierquote: { modelName: 'SupplierQuote' },
  invoice: { modelName: 'Invoice' },
};

const ALLOWED_ENTITIES = Object.keys(ENTITY_CONFIG);

/**
 * POST /deleted-records/restore
 * body: { entity, id }
 */
const restore = async (req, res) => {
  try {
    const role = String(req.admin?.role || '').trim();
    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({
        success: false,
        result: null,
        message: '只有 Admin 可以還原已刪除記錄',
      });
    }

    const entity = String(req.body?.entity || req.query?.entity || '')
      .trim()
      .toLowerCase();
    const id = String(req.body?.id || req.params?.id || '').trim();

    if (!ALLOWED_ENTITIES.includes(entity)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `entity 必須為 ${ALLOWED_ENTITIES.join('、')} 之一`,
      });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '請提供有效的記錄 id',
      });
    }

    const config = ENTITY_CONFIG[entity];
    const Model = mongoose.model(config.modelName);

    const doc = await Model.findOne({
      _id: id,
      removed: true,
      ...(config.extraMatch || {}),
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '找不到已刪除記錄，或記錄已被還原',
      });
    }

    // 還原前檢查單號是否已被其他未刪除記錄佔用
    const prefix = doc.numberPrefix != null ? String(doc.numberPrefix).trim() : '';
    const number = doc.number != null ? String(doc.number).trim() : '';
    if (prefix && number) {
      const dupQuery = {
        _id: { $ne: doc._id },
        removed: false,
        numberPrefix: prefix,
        number,
        ...(config.extraMatch || {}),
      };
      const dup = await Model.findOne(dupQuery).select('_id numberPrefix number').lean();
      if (dup) {
        return res.status(400).json({
          success: false,
          result: null,
          message: `無法還原：${prefix}-${number} 已被其他記錄使用`,
        });
      }
    }

    doc.removed = false;
    doc.updated = new Date();
    doc.modified_at = new Date();
    if (req.admin?._id) {
      doc.updatedBy = req.admin._id;
    }
    await doc.save();

    return res.status(200).json({
      success: true,
      result: { _id: doc._id, numberPrefix: doc.numberPrefix, number: doc.number },
      message: `已還原 ${prefix && number ? `${prefix}-${number}` : '記錄'}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || '還原失敗',
    });
  }
};

module.exports = restore;
