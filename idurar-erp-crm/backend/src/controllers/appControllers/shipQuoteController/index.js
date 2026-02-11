const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('ShipQuote');

const create = require('./create');
const update = require('./update');
const paginatedList = require('./paginatedList');
const read = require('./read');
const search = require('./search');
const linkProject = require('./linkProject');
const convertToSupplierQuote = require('./convertToSupplierQuote');

methods.list = paginatedList;
methods.read = read;
methods.search = search;

methods.create = create;
methods.update = update;
methods.linkProject = linkProject;
methods.convertToSupplierQuote = convertToSupplierQuote;

module.exports = methods;

