const mongoose = require('mongoose');
const {
  fetchPaginatedBySupplierQuoteNumberSort,
  buildWithinPrefixSearchMatch,
} = require('../../../helpers/paginatedQuoteSort');

const Model = mongoose.model('SupplierQuote');

const DEFAULT_SEARCH_FIELDS = [
  'address',
  'invoiceNumber',
  'numberPrefix',
  'number',
  'poNumber',
  'counterpartyInvoiceNumber',
];

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function substringRegex(searchTerm) {
  return new RegExp(escapeRegex(searchTerm), 'i');
}

const search = async (req, res) => {
  if (req.query.q === undefined || req.query.q === '' || req.query.q === ' ') {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found',
      })
      .end();
  }

  try {
    const searchTerm = String(req.query.q).trim();
    const fieldsArray = req.query.fields
      ? req.query.fields.split(',').map((f) => f.trim()).filter(Boolean)
      : DEFAULT_SEARCH_FIELDS;

    const hasPrefixFilter =
      req.query.filter != null &&
      String(req.query.filter).trim() === 'numberPrefix' &&
      req.query.equal != null &&
      String(req.query.equal) !== '';

    let matchQuery;

    if (hasPrefixFilter) {
      matchQuery = buildWithinPrefixSearchMatch(searchTerm, req.query.equal, fieldsArray, {
        removed: false,
      });
    } else {
      const fields = { $or: [] };
      const regex = substringRegex(searchTerm);

      fields.$or.push({ poNumber: { $regex: regex } });
      fields.$or.push({ address: { $regex: regex } });

      const ClientModel = mongoose.model('Client');
      const matchingClients = await ClientModel.find({
        name: { $regex: regex },
        removed: false,
      }).distinct('_id');
      if (matchingClients && matchingClients.length > 0) {
        fields.$or.push({ clients: { $in: matchingClients } });
        fields.$or.push({ client: { $in: matchingClients } });
      }

      for (const field of fieldsArray) {
        if (!field || ['poNumber', 'address'].includes(field)) continue;

        const schemaPath = Model.schema.path(field);
        const instance = schemaPath && schemaPath.instance ? schemaPath.instance : null;

        if (field === 'number') {
          if (instance === 'String') {
            fields.$or.push({ number: { $regex: regex } });
          } else if (instance === 'Number') {
            const numberValue = parseInt(searchTerm, 10);
            if (!Number.isNaN(numberValue)) {
              fields.$or.push({ number: numberValue });
            }
          }
          continue;
        }

        if (instance === 'Number') {
          const numberValue = parseInt(searchTerm, 10);
          if (!Number.isNaN(numberValue)) {
            fields.$or.push({ [field]: numberValue });
          }
          continue;
        }

        if (instance === 'String') {
          fields.$or.push({ [field]: { $regex: regex } });
        }
      }

      const numberPath = Model.schema.path('number');
      const numberIsString = numberPath && numberPath.instance === 'String';

      if (searchTerm.includes('-')) {
        const dashIdx = searchTerm.indexOf('-');
        const prefixPart = searchTerm.slice(0, dashIdx);
        const numberPart = searchTerm.slice(dashIdx + 1);
        if (prefixPart && numberPart) {
          if (numberIsString) {
            fields.$or.push({
              $and: [
                { numberPrefix: { $regex: substringRegex(prefixPart) } },
                { number: { $regex: substringRegex(numberPart) } },
              ],
            });
          } else {
            const numberValue = parseInt(numberPart, 10);
            if (!Number.isNaN(numberValue)) {
              fields.$or.push({
                $and: [
                  { numberPrefix: { $regex: substringRegex(prefixPart) } },
                  { number: numberValue },
                ],
              });
            }
          }
        }
      } else {
        fields.$or.push({ numberPrefix: { $regex: regex } });
        if (numberIsString) {
          fields.$or.push({ number: { $regex: regex } });
        } else {
          const numberValue = parseInt(searchTerm, 10);
          if (!Number.isNaN(numberValue)) {
            fields.$or.push({ number: numberValue });
          }
        }
      }

      const cpPath = Model.schema.path('counterpartyInvoiceNumber');
      if (cpPath && cpPath.instance === 'String') {
        fields.$or.push({ counterpartyInvoiceNumber: { $regex: regex } });
      }

      matchQuery = { removed: false, ...fields };
      if (
        req.query.filter != null &&
        String(req.query.filter).trim() !== '' &&
        req.query.equal != null &&
        String(req.query.equal) !== ''
      ) {
        matchQuery[req.query.filter] = req.query.equal;
      }
    }

    const results = await fetchPaginatedBySupplierQuoteNumberSort(Model, matchQuery, 0, 50, {
      populate: [
        { path: 'createdBy', select: 'name' },
        { path: 'followUpBy', select: 'name surname email' },
        { path: 'clients', select: 'name' },
        { path: 'client', select: 'name' },
        { path: 'supplier', select: 'name' },
      ],
    });

    if (results.length >= 1) {
      return res.status(200).json({
        success: true,
        result: results,
        message: 'Successfully found all documents',
      });
    }
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found',
    });
  } catch (error) {
    console.error('SupplierQuote search error:', error);
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Oops there is an Error',
    });
  }
};

module.exports = search;
