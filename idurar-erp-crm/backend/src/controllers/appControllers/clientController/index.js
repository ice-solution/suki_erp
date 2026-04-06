const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const createGeneric = require('@/controllers/middlewaresControllers/createCRUDController/create');
const updateGeneric = require('@/controllers/middlewaresControllers/createCRUDController/update');
const { findDuplicateByName } = require('@/helpers/uniqueEntityName');

const summary = require('./summary');

function modelController() {
  const Model = mongoose.model('Client');
  const methods = createCRUDController('Client');

  methods.summary = (req, res) => summary(Model, req, res);

  methods.create = async (req, res) => {
    const dup = await findDuplicateByName(Model, req.body?.name);
    if (dup) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '客戶名稱已存在，不能重複',
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
          message: '客戶名稱已存在，不能重複',
        });
      }
    }
    return updateGeneric(Model, req, res);
  };

  return methods;
}

module.exports = modelController();
