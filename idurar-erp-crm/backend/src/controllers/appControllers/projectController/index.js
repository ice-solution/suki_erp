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
const checkByInvoiceNumber = require('./checkByInvoiceNumber');
const checkInvoiceNumberChange = require('./checkInvoiceNumberChange');
const addSalary = require('./addSalary');
const updateSalary = require('./updateSalary');
const deleteSalary = require('./deleteSalary');
const addAttendance = require('./addAttendance');
const getAttendance = require('./getAttendance');
const updateAttendance = require('./updateAttendance');
const deleteAttendance = require('./deleteAttendance');
const recalculateWorkDays = require('./recalculateWorkDays');

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
  checkByInvoiceNumber,
  checkInvoiceNumberChange,
  addSalary,
  updateSalary,
  deleteSalary,
  addAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
  recalculateWorkDays,
};
