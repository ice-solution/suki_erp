const createAttendance = require('./createAttendance');
const updateAttendance = require('./updateAttendance');
const getAttendanceByProject = require('./getAttendanceByProject');
const getAttendanceByDate = require('./getAttendanceByDate');
const confirmAttendance = require('./confirmAttendance');
const generateAttendanceReport = require('./generateAttendanceReport');

module.exports = {
  createAttendance,
  updateAttendance,
  getAttendanceByProject,
  getAttendanceByDate,
  confirmAttendance,
  generateAttendanceReport,
};
