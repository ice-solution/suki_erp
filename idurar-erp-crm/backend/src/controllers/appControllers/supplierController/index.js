const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const createGeneric = require('@/controllers/middlewaresControllers/createCRUDController/create');
const updateGeneric = require('@/controllers/middlewaresControllers/createCRUDController/update');
const { findDuplicateByName } = require('@/helpers/uniqueEntityName');

function modelController() {
  const Model = mongoose.model('Supplier');
  const methods = createCRUDController('Supplier');

  methods.create = async (req, res) => {
    const dup = await findDuplicateByName(Model, req.body?.name);
    if (dup) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '供應商名稱已存在，不能重複',
      });
    }
    return createGeneric(Model, req, res);
  };

  methods.update = async (req, res) => {
    if (req.body?.name !== undefined) {
      const dup = await findDuplicateByName(Model, req.body.name, { excludeId: req.params.id });
      if (dup) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '供應商名稱已存在，不能重複',
        });
      }
    }
    return updateGeneric(Model, req, res);
  };

  return methods;
}

module.exports = modelController();
