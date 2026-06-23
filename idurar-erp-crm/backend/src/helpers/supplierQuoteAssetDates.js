function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getAssetDatePayload(body, prefix) {
  return {
    installationDate: parseOptionalDate(body[`${prefix}InstallationDate`]),
    dismantlingDate: parseOptionalDate(body[`${prefix}DismantlingDate`]),
  };
}

function stripSupplierQuoteAssetDateFields(body) {
  if (!body || typeof body !== 'object') return;
  delete body.installationDate;
  delete body.dismantlingDate;
  delete body.shipInstallationDate;
  delete body.shipDismantlingDate;
  delete body.winchInstallationDate;
  delete body.winchDismantlingDate;
}

function clearedAssetDateFields() {
  return {
    installationDate: null,
    dismantlingDate: null,
  };
}

module.exports = {
  parseOptionalDate,
  getAssetDatePayload,
  stripSupplierQuoteAssetDateFields,
  clearedAssetDateFields,
};
