const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const updateBySettingKey = async (req, res) => {
  const settingKey = req.params.settingKey || undefined;

  if (!settingKey) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingKey provided ',
    });
  }
  // 上傳 Logo 時由 singleStorageUpload 寫入 req.upload.filePath，或從 req.body.settingValue 取得
  const settingValue = req.body?.settingValue ?? req.upload?.filePath;

  if (!settingValue) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingValue provided ',
    });
  }
  let result = await Model.findOneAndUpdate(
    { settingKey },
    { settingValue },
    { new: true, runValidators: true }
  ).exec();
  // 若為依類型 Logo 設定且尚無該 key，則自動建立（方便現有環境不需跑 setup）
  if (!result && settingKey && settingKey.startsWith('company_logo_')) {
    result = await Model.create({
      settingCategory: 'company_settings',
      settingKey,
      settingValue,
      valueType: 'image',
    });
  }
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found by this settingKey: ' + settingKey,
    });
  } else {
    return res.status(200).json({
      success: true,
      result,
      message: 'we update this document by this settingKey: ' + settingKey,
    });
  }
};

module.exports = updateBySettingKey;
