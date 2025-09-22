const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('WorkProgress');

const create = require('./create');
const read = require('./read');
const update = require('./update');
const list = require('./list');
const uploadImage = require('./uploadImage');

methods.create = create;
methods.read = read;
methods.update = update;
methods.list = list;
methods.uploadImage = uploadImage;

module.exports = methods;
