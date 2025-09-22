const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Quote');

const sendMail = require('./sendMail');
const create = require('./create');
const summary = require('./summary');
const update = require('./update');
const convertQuoteToInvoice = require('./convertQuoteToInvoice');
const paginatedList = require('./paginatedList');
const read = require('./read');
const linkProject = require('./linkProject');
const search = require('./search');

methods.list = paginatedList;
methods.read = read;
methods.search = search;

methods.mail = sendMail;
methods.create = create;
methods.update = update;
methods.convert = convertQuoteToInvoice;
methods.summary = summary;
methods.linkProject = linkProject;

module.exports = methods;
