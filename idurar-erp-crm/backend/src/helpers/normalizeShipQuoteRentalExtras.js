const RENTAL_EXTRA_UNITS = ['日', '米', '部', '套'];

function normalizeShipQuoteRentalExtraItems(body) {
  if (!body || body.shipType !== '租賃') {
    if (body) body.rentalExtraItems = [];
    return body;
  }

  if (!Array.isArray(body.rentalExtraItems)) {
    body.rentalExtraItems = [];
    return body;
  }

  const allowed = new Set(RENTAL_EXTRA_UNITS);
  body.rentalExtraItems = body.rentalExtraItems
    .map((row, index) => {
      const description = row?.description != null ? String(row.description).trim() : '';
      const unitRaw = row?.unit != null ? String(row.unit).trim() : '';
      const unit = allowed.has(unitRaw) ? unitRaw : undefined;
      const unitPrice =
        row?.unitPrice != null && row.unitPrice !== '' && Number.isFinite(Number(row.unitPrice))
          ? Number(row.unitPrice)
          : undefined;
      return { description, unit, unitPrice, sortOrder: index };
    })
    .filter((row) => row.description);

  return body;
}

function getSortedRentalExtraItems(model) {
  if (!model) return [];
  const rows = Array.isArray(model.rentalExtraItems) ? model.rentalExtraItems : [];
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

module.exports = {
  RENTAL_EXTRA_UNITS,
  normalizeShipQuoteRentalExtraItems,
  getSortedRentalExtraItems,
};
