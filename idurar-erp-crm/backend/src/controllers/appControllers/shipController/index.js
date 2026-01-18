const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function modelController() {
  const Model = mongoose.model('Ship');
  const methods = createCRUDController('Ship');
  
  return methods;
}

module.exports = modelController();







