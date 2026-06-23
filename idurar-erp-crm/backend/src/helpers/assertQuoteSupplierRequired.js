function assertQuoteSupplierRequired(body) {
  const supplier = body?.supplier;
  const empty =
    supplier == null ||
    supplier === '' ||
    (typeof supplier === 'object' && supplier._id == null && Object.keys(supplier).length === 0);
  if (empty) {
    const err = new Error('請選擇供應商');
    err.statusCode = 400;
    throw err;
  }
}

module.exports = assertQuoteSupplierRequired;
