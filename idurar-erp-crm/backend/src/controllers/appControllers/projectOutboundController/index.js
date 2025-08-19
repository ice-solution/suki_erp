const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const listByProject = require('./listByProject');
const confirm = require('./confirm');

module.exports = {
  create,
  read,
  update,
  delete: remove,
  listByProject,
  confirm,
};
