const { catchErrors } = require('@/handlers/errorHandlers');
const buildAssetListMatch = require('./buildAssetListMatch');

const STATUS_KEYS = [
  'pending_maintenance',
  'normal',
  'returned_warehouse_cn',
  'returned_warehouse_hk',
  'in_use',
];

function emptyStatusCounts() {
  return STATUS_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
}

function makeAssetStatusSummary(Model) {
  return catchErrors(async (req, res) => {
    const match = await buildAssetListMatch(req);
    const rows = await Model.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const counts = emptyStatusCounts();
    rows.forEach((row) => {
      if (row._id && Object.prototype.hasOwnProperty.call(counts, row._id)) {
        counts[row._id] = row.count;
      }
    });

    return res.status(200).json({
      success: true,
      result: counts,
      message: 'Successfully counted assets by status',
    });
  });
}

module.exports = { makeAssetStatusSummary, STATUS_KEYS };
