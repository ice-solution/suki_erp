const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const setLoginCredentials = require('./setLoginCredentials');

function modelController() {
  const Model = mongoose.model('Contractor');
  const methods = createCRUDController('Contractor');

  // 添加自定義方法
  methods.setLoginCredentials = setLoginCredentials;
  
  return methods;
}

module.exports = modelController();

