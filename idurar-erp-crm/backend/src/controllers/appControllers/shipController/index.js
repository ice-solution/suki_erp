const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const list = require('./list');

function modelController() {
  const methods = createCRUDController('Ship');
  methods.list = list;
  return methods;
}

module.exports = modelController();







