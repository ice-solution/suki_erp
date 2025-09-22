const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const list = require('./list');
const listAll = require('./listAll');
const search = require('./search');
const filter = require('./filter');
const summary = require('./summary');
const paginatedList = require('./paginatedList');
const sync = require('./sync');
const checkByPoNumber = require('./checkByPoNumber');

module.exports = {
  create,
  read,
  update,
  delete: remove,
  list,
  listAll,
  search,
  filter,
  summary,
  paginatedList,
  sync,
  checkByPoNumber,
};
