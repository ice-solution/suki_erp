const mongoose = require('mongoose');
const { makeAssetStatusSummary } = require('../_shared/assetStatusSummary');

const Model = mongoose.model('Ship');

module.exports = makeAssetStatusSummary(Model);
