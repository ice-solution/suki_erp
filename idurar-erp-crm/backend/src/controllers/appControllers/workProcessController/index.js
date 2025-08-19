const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const listByProject = require('./listByProject');
const updateProgress = require('./updateProgress');
const getProjectSchedule = require('./getProjectSchedule');

module.exports = {
  create,
  read,
  update,
  delete: remove,
  listByProject,
  updateProgress,
  getProjectSchedule,
};
