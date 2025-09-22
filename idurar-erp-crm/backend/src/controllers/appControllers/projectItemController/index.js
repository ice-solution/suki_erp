const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('ProjectItem');

const create = require('./create');
const read = require('./read');
const update = require('./update');
const list = require('./list');
const search = require('./search');

methods.create = create;
methods.read = read;
methods.update = update;
methods.list = list;
methods.search = search;

module.exports = methods;
