const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const list = require('./list');
const bindings = require('./bindings');
const update = require('./update');

function modelController() {
  const methods = createCRUDController('Winch');
  methods.list = list;
  methods.bindings = bindings;
  methods.update = update;
  return methods;
}

module.exports = modelController();







