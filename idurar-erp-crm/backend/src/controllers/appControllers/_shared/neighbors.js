const mongoose = require('mongoose');

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generic neighbors resolver for {created:-1} search ordering.
 * Returns nearest previous/next doc _id by created desc then _id desc.
 */
async function neighborsByCreatedDesc({ Model, baseMatch, currentId, q, fieldsArray }) {
  const cur = await Model.findOne({ _id: currentId, removed: false }).select('_id created createdAt').lean();
  if (!cur) return { prevId: null, nextId: null };

  const createdVal = cur.createdAt || cur.created || null;

  const match = { ...(baseMatch || {}), removed: false };
  if (q && fieldsArray && fieldsArray.length) {
    const rx = new RegExp(escapeRegex(q), 'i');
    match.$or = fieldsArray.map((f) => ({ [f]: { $regex: rx } }));
  }

  // If created is missing, fall back to pure _id ordering.
  const hasCreated = createdVal != null;

  const prevQuery = hasCreated
    ? {
        ...match,
        $or: [
          { createdAt: { $gt: createdVal } },
          { created: { $gt: createdVal } },
          { $and: [{ createdAt: createdVal }, { _id: { $gt: cur._id } }] },
          { $and: [{ created: createdVal }, { _id: { $gt: cur._id } }] },
        ],
      }
    : { ...match, _id: { $gt: cur._id } };

  const nextQuery = hasCreated
    ? {
        ...match,
        $or: [
          { createdAt: { $lt: createdVal } },
          { created: { $lt: createdVal } },
          { $and: [{ createdAt: createdVal }, { _id: { $lt: cur._id } }] },
          { $and: [{ created: createdVal }, { _id: { $lt: cur._id } }] },
        ],
      }
    : { ...match, _id: { $lt: cur._id } };

  const sortDesc = hasCreated ? { createdAt: -1, created: -1, _id: -1 } : { _id: -1 };
  const sortAsc = hasCreated ? { createdAt: 1, created: 1, _id: 1 } : { _id: 1 };

  const [prevDoc, nextDoc] = await Promise.all([
    Model.findOne(prevQuery).select('_id').sort(sortDesc).lean(),
    Model.findOne(nextQuery).select('_id').sort(sortAsc).lean(),
  ]);

  return { prevId: prevDoc ? String(prevDoc._id) : null, nextId: nextDoc ? String(nextDoc._id) : null };
}

async function neighborsByYearDescNumberAsc({ Model, baseMatch, currentId }) {
  const cur = await Model.findOne({ _id: currentId, removed: false })
    .select('_id year number')
    .lean();
  if (!cur) return { prevId: null, nextId: null };

  const match = { ...(baseMatch || {}), removed: false };

  const prevQuery = {
    ...match,
    $or: [
      { year: { $gt: cur.year } },
      { $and: [{ year: cur.year }, { number: { $lt: cur.number } }] },
    ],
  };
  const nextQuery = {
    ...match,
    $or: [
      { year: { $lt: cur.year } },
      { $and: [{ year: cur.year }, { number: { $gt: cur.number } }] },
    ],
  };

  const [prevDoc, nextDoc] = await Promise.all([
    Model.findOne(prevQuery).select('_id').sort({ year: 1, number: -1 }).lean(),
    Model.findOne(nextQuery).select('_id').sort({ year: -1, number: 1 }).lean(),
  ]);

  return { prevId: prevDoc ? String(prevDoc._id) : null, nextId: nextDoc ? String(nextDoc._id) : null };
}

async function neighborsForQuoteDefault({ currentId, q }) {
  const Model = mongoose.model('Quote');
  const cur = await Model.findOne({ _id: currentId, removed: false }).select('_id numberPrefix year number').lean();
  if (!cur) return { prevId: null, nextId: null };

  const prefixRank =
    cur.numberPrefix === 'SML' ? 0 : cur.numberPrefix === 'QU' ? 1 : 2;

  const match = { removed: false };
  if (q && String(q).trim()) {
    const escaped = escapeRegex(String(q).trim());
    const rx = new RegExp(escaped, 'i');
    match.$or = [
      { address: { $regex: rx } },
      { invoiceNumber: { $regex: rx } },
      { contactPerson: { $regex: rx } },
      { numberPrefix: { $regex: rx } },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: [{ $ifNull: ['$numberPrefix', ''] }, '-', { $toString: '$number' }] },
            regex: escaped,
            options: 'i',
          },
        },
      },
    ];
  }

  const pipelineBase = [
    { $match: match },
    {
      $addFields: {
        _prefixRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$numberPrefix', 'SML'] }, then: 0 },
              { case: { $eq: ['$numberPrefix', 'QU'] }, then: 1 },
            ],
            default: 2,
          },
        },
      },
    },
  ];

  const prevMatch = {
    $or: [
      { _prefixRank: { $lt: prefixRank } },
      {
        $and: [
          { _prefixRank: prefixRank },
          {
            $or: [
              { year: { $gt: cur.year } },
              { $and: [{ year: cur.year }, { number: { $lt: cur.number } }] },
            ],
          },
        ],
      },
    ],
  };
  const nextMatch = {
    $or: [
      { _prefixRank: { $gt: prefixRank } },
      {
        $and: [
          { _prefixRank: prefixRank },
          {
            $or: [
              { year: { $lt: cur.year } },
              { $and: [{ year: cur.year }, { number: { $gt: cur.number } }] },
            ],
          },
        ],
      },
    ],
  };

  const [prevAgg, nextAgg] = await Promise.all([
    Model.aggregate([...pipelineBase, { $match: prevMatch }, { $sort: { _prefixRank: -1, year: 1, number: -1 } }, { $limit: 1 }, { $project: { _id: 1 } }]),
    Model.aggregate([...pipelineBase, { $match: nextMatch }, { $sort: { _prefixRank: 1, year: -1, number: 1 } }, { $limit: 1 }, { $project: { _id: 1 } }]),
  ]);

  return {
    prevId: prevAgg && prevAgg[0] ? String(prevAgg[0]._id) : null,
    nextId: nextAgg && nextAgg[0] ? String(nextAgg[0]._id) : null,
  };
}

module.exports = {
  neighborsByCreatedDesc,
  neighborsByYearDescNumberAsc,
  neighborsForQuoteDefault,
};

