const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const methods = createCRUDController('WarehouseTransaction');

methods.list = require('./paginatedList');

module.exports = methods;

