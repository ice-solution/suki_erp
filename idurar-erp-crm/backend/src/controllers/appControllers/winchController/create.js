const mongoose = require('mongoose');

const Model = mongoose.model('Winch');
const { assertUniqueAssetIdentifier } = require('@/helpers/assertUniqueAssetIdentifier');

const create = async (req, res) => {
  const check = await assertUniqueAssetIdentifier(Model, 'serialNumber', req.body?.serialNumber, {
    label: 'RegistrationNumber',
  });
  if (!check.ok) {
    return res.status(400).json({
      success: false,
      result: null,
      message: check.message,
    });
  }
  req.body.serialNumber = check.value;
  req.body.removed = false;
  const result = await new Model({ ...req.body }).save();
  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Created the document in Model ',
  });
};

module.exports = create;
