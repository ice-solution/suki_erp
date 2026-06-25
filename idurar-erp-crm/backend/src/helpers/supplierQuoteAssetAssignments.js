const mongoose = require('mongoose');
const Ship = mongoose.model('Ship');
const Winch = mongoose.model('Winch');
const SupplierQuoteAssetBinding = mongoose.model('SupplierQuoteAssetBinding');
const { parseOptionalDate } = require('@/helpers/supplierQuoteAssetDates');
const { assertAssetAssignableForSupplierQuote } = require('@/helpers/assignableAssetStatus');

const PENDING_RETURN_STATUS = 'returned_warehouse_cn';
const HK_WAREHOUSE_STATUS = 'returned_warehouse_hk';

function normalizeRefId(ref) {
  if (ref == null || ref === '') return null;
  if (typeof ref === 'object' && ref._id != null) return ref._id.toString();
  return ref.toString();
}

function normalizeShipRow(row) {
  if (!row) return null;
  const ship = normalizeRefId(row.ship);
  const installationDate = parseOptionalDate(row.installationDate ?? row.shipInstallationDate);
  const expiredDate = parseOptionalDate(row.expiredDate ?? row.shipExpiredDate);
  const dismantlingDate = parseOptionalDate(row.dismantlingDate ?? row.shipDismantlingDate);
  if (!ship && !installationDate && !expiredDate && !dismantlingDate) return null;
  return { ship, installationDate, expiredDate, dismantlingDate };
}

function normalizeWinchRow(row) {
  if (!row) return null;
  const winch = normalizeRefId(row.winch);
  const installationDate = parseOptionalDate(row.installationDate ?? row.winchInstallationDate);
  const expiredDate = parseOptionalDate(row.expiredDate ?? row.winchExpiredDate);
  const dismantlingDate = parseOptionalDate(row.dismantlingDate ?? row.winchDismantlingDate);
  if (!winch && !installationDate && !expiredDate && !dismantlingDate) return null;
  return { winch, installationDate, expiredDate, dismantlingDate };
}

function parseJsonArray(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function migrateFromLegacyAssetAssignments(raw) {
  const shipAssignments = [];
  const winchAssignments = [];
  parseJsonArray(raw).forEach((row) => {
    if (row?.ship) {
      shipAssignments.push(
        normalizeShipRow({
          ship: row.ship,
          installationDate: row.shipInstallationDate,
          expiredDate: row.shipExpiredDate,
          dismantlingDate: row.shipDismantlingDate,
        })
      );
    }
    if (row?.winch) {
      winchAssignments.push(
        normalizeWinchRow({
          winch: row.winch,
          installationDate: row.winchInstallationDate,
          expiredDate: row.winchExpiredDate,
          dismantlingDate: row.winchDismantlingDate,
        })
      );
    }
  });
  return {
    shipAssignments: shipAssignments.filter(Boolean),
    winchAssignments: winchAssignments.filter(Boolean),
  };
}

function parseShipWinchAssignmentsInput(body) {
  let shipAssignments = parseJsonArray(body?.shipAssignments)
    .map(normalizeShipRow)
    .filter(Boolean);
  let winchAssignments = parseJsonArray(body?.winchAssignments)
    .map(normalizeWinchRow)
    .filter(Boolean);

  if (!shipAssignments.length && !winchAssignments.length) {
    const migrated = migrateFromLegacyAssetAssignments(body?.assetAssignments);
    shipAssignments = migrated.shipAssignments;
    winchAssignments = migrated.winchAssignments;
  }

  if (!shipAssignments.length && body?.ship) {
    shipAssignments.push(
      normalizeShipRow({
        ship: body.ship,
        installationDate: body.shipInstallationDate,
        dismantlingDate: body.shipDismantlingDate,
      })
    );
  }
  if (!winchAssignments.length && body?.winch) {
    winchAssignments.push(
      normalizeWinchRow({
        winch: body.winch,
        installationDate: body.winchInstallationDate,
        dismantlingDate: body.winchDismantlingDate,
      })
    );
  }

  return {
    shipAssignments: shipAssignments.filter(Boolean),
    winchAssignments: winchAssignments.filter(Boolean),
  };
}

function buildAssignmentsFromExistingQuote(existingQuote) {
  if (!existingQuote) {
    return { shipAssignments: [], winchAssignments: [] };
  }

  if (existingQuote.shipAssignments?.length || existingQuote.winchAssignments?.length) {
    return {
      shipAssignments: (existingQuote.shipAssignments || []).map((row) => normalizeShipRow(row)).filter(Boolean),
      winchAssignments: (existingQuote.winchAssignments || []).map((row) => normalizeWinchRow(row)).filter(Boolean),
    };
  }

  return migrateFromLegacyAssetAssignments(existingQuote.assetAssignments);
}

function collectAssetIds(shipAssignments, winchAssignments) {
  const shipIds = new Set(
    (shipAssignments || []).map((row) => row.ship).filter(Boolean).map(String)
  );
  const winchIds = new Set(
    (winchAssignments || []).map((row) => row.winch).filter(Boolean).map(String)
  );
  return { shipIds, winchIds };
}

function pickPrimaryActiveIds(shipAssignments, winchAssignments) {
  const ship =
    (shipAssignments || []).find((row) => row.ship && !row.dismantlingDate)?.ship || null;
  const winch =
    (winchAssignments || []).find((row) => row.winch && !row.dismantlingDate)?.winch || null;
  return { ship, winch };
}

async function closeBinding({ supplierQuoteId, assetType, assetId, installationDate, dismantlingDate }) {
  const filter = {
    supplierQuote: supplierQuoteId,
    assetType,
    returnDate: null,
    removed: false,
  };
  if (assetType === 'ship') filter.ship = assetId;
  else filter.winch = assetId;

  await SupplierQuoteAssetBinding.findOneAndUpdate(
    filter,
    {
      returnDate: dismantlingDate || new Date(),
      installationDate: installationDate || null,
      dismantlingDate: dismantlingDate || null,
    },
    { sort: { created: -1 } }
  );
}

async function releaseAssetToPendingReturn(Model, assetId, { installationDate, expiredDate, dismantlingDate }) {
  await Model.findByIdAndUpdate(assetId, {
    status: PENDING_RETURN_STATUS,
    supplierNumber: null,
    installationDate: installationDate || null,
    expiredDate: expiredDate || null,
    dismantlingDate: dismantlingDate || null,
    updated: new Date(),
  });
}

async function releaseAssetToHkWarehouse(Model, assetId) {
  await Model.findByIdAndUpdate(assetId, {
    status: HK_WAREHOUSE_STATUS,
    supplierNumber: null,
    expiredDate: null,
    installationDate: null,
    dismantlingDate: null,
    updated: new Date(),
  });
}

async function bindActiveAsset(Model, assetType, assetId, {
  supplierQuoteNumber,
  installationDate,
  expiredDate,
  supplierQuoteId,
  quoteNumber,
  adminId,
  shouldCreateBinding,
}) {
  await Model.findByIdAndUpdate(assetId, {
    status: 'in_use',
    supplierNumber: supplierQuoteNumber,
    installationDate: installationDate || null,
    expiredDate: expiredDate || null,
    dismantlingDate: null,
    updated: new Date(),
  });

  if (shouldCreateBinding) {
    try {
      await SupplierQuoteAssetBinding.create({
        assetType,
        ship: assetType === 'ship' ? assetId : undefined,
        winch: assetType === 'winch' ? assetId : undefined,
        supplierQuote: supplierQuoteId,
        supplierQuoteNumber,
        quoteNumber,
        installationDate: installationDate || null,
        createdBy: adminId || undefined,
      });
    } catch (bindingErr) {
      console.error(`新增 SupplierQuoteAssetBinding（${assetType}）失敗:`, bindingErr);
    }
  } else {
    await SupplierQuoteAssetBinding.findOneAndUpdate(
      {
        supplierQuote: supplierQuoteId,
        assetType,
        ...(assetType === 'ship' ? { ship: assetId } : { winch: assetId }),
        returnDate: null,
        removed: false,
      },
      { installationDate: installationDate || null },
      { sort: { created: -1 } }
    );
  }
}

async function processAssetSide({
  assetType,
  assetId,
  installationDate,
  expiredDate,
  dismantlingDate,
  supplierQuoteId,
  supplierQuoteNumber,
  quoteNumber,
  adminId,
  previousRows,
  assetIdField,
}) {
  if (!assetId) return;

  const Model = assetType === 'ship' ? Ship : Winch;
  const label = assetType === 'ship' ? '船隻' : '爬纜器';
  const assetDoc = await Model.findById(assetId).select('status registrationNumber serialNumber supplierNumber').lean();

  const rowHasDismantling = !!dismantlingDate;
  const wasOnQuoteBefore = (previousRows || []).some((row) => String(row[assetIdField]) === String(assetId));
  const isNewAssignment = !wasOnQuoteBefore;

  if (rowHasDismantling) {
    if (assetDoc) {
      if (isNewAssignment) {
        assertAssetAssignableForSupplierQuote(assetDoc, label, { supplierQuoteNumber });
        try {
          await SupplierQuoteAssetBinding.create({
            assetType,
            ship: assetType === 'ship' ? assetId : undefined,
            winch: assetType === 'winch' ? assetId : undefined,
            supplierQuote: supplierQuoteId,
            supplierQuoteNumber,
            quoteNumber,
            installationDate: installationDate || null,
            dismantlingDate: dismantlingDate || null,
            returnDate: dismantlingDate || new Date(),
            createdBy: adminId || undefined,
          });
        } catch (bindingErr) {
          console.error(`新增 SupplierQuoteAssetBinding（${assetType}）失敗:`, bindingErr);
        }
      } else {
        await closeBinding({
          supplierQuoteId,
          assetType,
          assetId,
          installationDate,
          dismantlingDate,
        });
      }
      await releaseAssetToPendingReturn(Model, assetId, { installationDate, expiredDate, dismantlingDate });
    }
    return;
  }

  assertAssetAssignableForSupplierQuote(assetDoc, label, { supplierQuoteNumber });

  await bindActiveAsset(Model, assetType, assetId, {
    supplierQuoteNumber,
    installationDate,
    expiredDate,
    supplierQuoteId,
    quoteNumber,
    adminId,
    shouldCreateBinding: isNewAssignment,
  });
}

async function syncSupplierQuoteAssetAssignments({ supplierQuote, body, existingQuote, adminId }) {
  const { shipAssignments, winchAssignments } = parseShipWinchAssignmentsInput(body);
  const previous = buildAssignmentsFromExistingQuote(existingQuote);
  const supplierQuoteNumber = `${supplierQuote.numberPrefix || 'S'}-${supplierQuote.number}`;
  const quoteNumber = supplierQuote.invoiceNumber || '';
  const supplierQuoteId = supplierQuote._id;

  const prevIds = collectAssetIds(previous.shipAssignments, previous.winchAssignments);
  const newIds = collectAssetIds(shipAssignments, winchAssignments);

  for (const shipId of prevIds.shipIds) {
    if (!newIds.shipIds.has(shipId)) {
      await releaseAssetToHkWarehouse(Ship, shipId);
      await closeBinding({
        supplierQuoteId,
        assetType: 'ship',
        assetId: shipId,
        installationDate: null,
        dismantlingDate: new Date(),
      });
    }
  }
  for (const winchId of prevIds.winchIds) {
    if (!newIds.winchIds.has(winchId)) {
      await releaseAssetToHkWarehouse(Winch, winchId);
      await closeBinding({
        supplierQuoteId,
        assetType: 'winch',
        assetId: winchId,
        installationDate: null,
        dismantlingDate: new Date(),
      });
    }
  }

  for (const row of shipAssignments) {
    if (!row.ship) continue;
    await processAssetSide({
      assetType: 'ship',
      assetId: row.ship,
      installationDate: row.installationDate,
      expiredDate: row.expiredDate,
      dismantlingDate: row.dismantlingDate,
      supplierQuoteId,
      supplierQuoteNumber,
      quoteNumber,
      adminId,
      previousRows: previous.shipAssignments,
      assetIdField: 'ship',
    });
  }

  for (const row of winchAssignments) {
    if (!row.winch) continue;
    await processAssetSide({
      assetType: 'winch',
      assetId: row.winch,
      installationDate: row.installationDate,
      expiredDate: row.expiredDate,
      dismantlingDate: row.dismantlingDate,
      supplierQuoteId,
      supplierQuoteNumber,
      quoteNumber,
      adminId,
      previousRows: previous.winchAssignments,
      assetIdField: 'winch',
    });
  }

  const primary = pickPrimaryActiveIds(shipAssignments, winchAssignments);
  await mongoose.model('SupplierQuote').findByIdAndUpdate(supplierQuoteId, {
    shipAssignments,
    winchAssignments,
    assetAssignments: [],
    ship: primary.ship || null,
    winch: primary.winch || null,
  });

  supplierQuote.shipAssignments = shipAssignments;
  supplierQuote.winchAssignments = winchAssignments;
  supplierQuote.assetAssignments = [];
  supplierQuote.ship = primary.ship || null;
  supplierQuote.winch = primary.winch || null;

  return { shipAssignments, winchAssignments };
}

function stripLegacyAssetFieldsFromBody(body) {
  if (!body || typeof body !== 'object') return;
  delete body.assetAssignments;
  delete body.shipInstallationDate;
  delete body.shipDismantlingDate;
  delete body.winchInstallationDate;
  delete body.winchDismantlingDate;
}

/** @deprecated 使用 parseShipWinchAssignmentsInput */
function parseAssetAssignmentsInput(body) {
  const { shipAssignments, winchAssignments } = parseShipWinchAssignmentsInput(body);
  return [...shipAssignments, ...winchAssignments];
}

function calcRentalOverageDays(installDate, dismantlingDate) {
  if (!installDate || !dismantlingDate) return null;
  const install = new Date(installDate);
  const dismantle = new Date(dismantlingDate);
  if (Number.isNaN(install.getTime()) || Number.isNaN(dismantle.getTime())) return null;
  const start = new Date(install.getFullYear(), install.getMonth(), install.getDate());
  const end = new Date(dismantle.getFullYear(), dismantle.getMonth(), dismantle.getDate());
  const days = Math.round((end - start) / 86400000);
  if (days <= 60) return 0;
  return days - 60;
}

module.exports = {
  parseShipWinchAssignmentsInput,
  parseAssetAssignmentsInput,
  buildAssignmentsFromExistingQuote,
  syncSupplierQuoteAssetAssignments,
  stripLegacyAssetFieldsFromBody,
  calcRentalOverageDays,
};
