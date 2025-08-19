const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const listByWorkProcess = require('./listByWorkProcess');
const listByProject = require('./listByProject');
const approve = require('./approve');
const reject = require('./reject');
const uploadImages = require('./uploadImages');

module.exports = {
  create,
  read,
  update,
  delete: remove,
  listByWorkProcess,
  listByProject,
  approve,
  reject,
  uploadImages,
};
