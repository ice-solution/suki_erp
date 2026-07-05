const mongoose = require('mongoose');
const { makeAssetStatusSummary } = require('../_shared/assetStatusSummary');

const Model = mongoose.model('Winch');

module.exports = makeAssetStatusSummary(Model);
