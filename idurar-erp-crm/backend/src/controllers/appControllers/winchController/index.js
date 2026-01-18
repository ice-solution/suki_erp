const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function modelController() {
  const Model = mongoose.model('Winch');
  const methods = createCRUDController('Winch');
  
  return methods;
}

module.exports = modelController();







