const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('ShipQuote');

const remove = require('./remove');
methods.delete = remove;

const create = require('./create');
const update = require('./update');
const paginatedList = require('./paginatedList');
const read = require('./read');
const search = require('./search');
const linkProject = require('./linkProject');
const convertToSupplierQuote = require('./convertToSupplierQuote');
const poOrderStatus = require('./poOrderStatus');
const poInvoiceStatus = require('./poInvoiceStatus');
const convertShipQuoteToInvoice = require('./convertShipQuoteToInvoice');
const neighbors = require('./neighbors');
const poSyncHandlers = require('./poSync');

methods.list = paginatedList;
methods.read = read;
methods.search = search;
methods.neighbors = neighbors;

methods.create = create;
methods.update = update;
methods.linkProject = linkProject;
methods.convertToSupplierQuote = convertToSupplierQuote;
methods.poOrderStatus = poOrderStatus;
methods.poInvoiceStatus = poInvoiceStatus;
methods.convert = convertShipQuoteToInvoice;
methods.poSyncPreview = poSyncHandlers.poSyncPreview;
methods.poSyncExecute = poSyncHandlers.poSyncExecute;

module.exports = methods;

