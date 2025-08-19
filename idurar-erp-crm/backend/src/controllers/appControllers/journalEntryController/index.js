const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const list = require('./list');
const post = require('./post');
const reverse = require('./reverse');
const generateAutoEntry = require('./generateAutoEntry');

module.exports = {
  create,
  read,
  update,
  delete: remove,
  list,
  post,
  reverse,
  generateAutoEntry,
};
