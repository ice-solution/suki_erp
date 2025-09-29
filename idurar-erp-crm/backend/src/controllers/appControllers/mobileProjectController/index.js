const getContractorProjects = require('./getContractorProjects');
const getProjectWorkProgress = require('./getProjectWorkProgress');
const updateWorkProgress = require('./updateWorkProgress');
const uploadImage = require('./uploadImage');

const methods = {
  getContractorProjects,
  getProjectWorkProgress,
  updateWorkProgress,
  uploadImage
};

module.exports = methods;


