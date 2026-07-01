const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const updateManySetting = async (req, res) => {
  // req/body = [{settingKey:"",settingValue}]
  let settingsHasError = false;
  const updateDataArray = [];
  const { settings } = req.body;

  for (const setting of settings) {
    if (!setting.hasOwnProperty('settingKey') || !setting.hasOwnProperty('settingValue')) {
      settingsHasError = true;
      break;
    }

    const { settingKey, settingValue } = setting;

    const setOnInsert = {};
    const setFields = { settingValue };
    // 為新插入的設定補上 settingCategory，避免前端依 category 讀取不到
    if (settingKey === 'warehouse_list') {
      setOnInsert.settingCategory = 'warehouse_settings';
      setOnInsert.valueType = 'array';
    }
    if (settingKey === 'item_units' || settingKey === 'warehouse_item_categories') {
      setOnInsert.settingCategory = 'app_settings';
      setOnInsert.valueType = 'array';
    }
    const { isLastNumberSettingKey, LAST_NUMBER_CATEGORY } = require('@/helpers/lastNumberSettings');
    if (isLastNumberSettingKey(settingKey)) {
      setFields.settingCategory = LAST_NUMBER_CATEGORY;
      setFields.valueType = 'number';
    }

    updateDataArray.push({
      updateOne: {
        filter: { settingKey: settingKey },
        update: {
          $set: setFields,
          ...(Object.keys(setOnInsert).length ? { $setOnInsert: setOnInsert } : {}),
        },
        upsert: true,
      },
    });
  }

  if (updateDataArray.length === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settings provided ',
    });
  }
  if (settingsHasError) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'Settings provided has Error',
    });
  }
  const result = await Model.bulkWrite(updateDataArray);

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No settings found by to update',
    });
  } else {
    return res.status(200).json({
      success: true,
      result: [],
      message: 'we update all settings',
    });
  }
};

module.exports = updateManySetting;
