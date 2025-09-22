const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const search = require('./search');
const list = require('./list');
const listAll = require('./listAll');
const filter = require('./filter');
const summary = require('./summary');
const paginatedList = require('./paginatedList');
const convert = require('./convertSupplierQuoteToInvoice');
const linkProject = require('./linkProject');
const mail = require('./sendMail');
const deleteFile = require('./deleteFile');

module.exports = {
  create,
  read,
  update,
  delete: remove,
  search,
  list,
  listAll,
  filter,
  summary,
  paginatedList,
  convert,
  linkProject,
  mail,
  deleteFile,
};
