const login = require('./login');
const register = require('./register');
const setPassword = require('./setPassword');
const getProfile = require('./getProfile');
const updateProfile = require('./updateProfile');
const refreshToken = require('./refreshToken');

module.exports = {
  login,
  register,
  setPassword,
  getProfile,
  updateProfile,
  refreshToken,
};
