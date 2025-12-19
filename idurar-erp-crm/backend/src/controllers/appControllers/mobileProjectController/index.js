const getContractorProjects = require('./getContractorProjects');
const getProjectWorkProgress = require('./getProjectWorkProgress');
const updateWorkProgress = require('./updateWorkProgress');
const uploadImage = require('./uploadImage');
const getProjectEmployees = require('./getProjectEmployees');
const batchCheckIn = require('./batchCheckIn');
const getAttendanceByDate = require('./getAttendanceByDate');
const makeupCheckIn = require('./makeupCheckIn');

const methods = {
  getContractorProjects,
  getProjectWorkProgress,
  updateWorkProgress,
  uploadImage,
  getProjectEmployees,
  batchCheckIn,
  getAttendanceByDate,
  makeupCheckIn
};

module.exports = methods;


