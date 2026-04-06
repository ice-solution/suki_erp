const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Invoice');

const { loadSettings } = require('@/middlewares/settings');

const summary = async (req, res) => {
  let defaultType = 'month';

  const { type } = req.query;

  const settings = await loadSettings();

  if (type) {
    if (['week', 'month', 'year'].includes(type)) {
      defaultType = type;
    } else {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid type',
      });
    }
  }

  const currentDate = moment();
  let startDate = currentDate.clone().startOf(defaultType);
  let endDate = currentDate.clone().endOf(defaultType);

  const statuses = ['draft', 'pending', 'overdue', 'paid', 'unpaid', 'partially'];

  const response = await Model.aggregate([
    {
      $match: {
        removed: false,
        // date: {
        //   $gte: startDate.toDate(),
        //   $lte: endDate.toDate(),
        // },
      },
    },
    {
      $facet: {
        totalInvoice: [
          {
            $group: {
              _id: null,
              total: {
                $sum: '$total',
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              total: '$total',
              count: '$count',
            },
          },
        ],
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        paymentStatusCounts: [
          {
            $group: {
              _id: '$paymentStatus',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        overdueCounts: [
          {
            $match: {
              expiredDate: {
                $lt: new Date(),
              },
            },
          },
          {
            $group: {
              _id: '$status',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
      },
    },
  ]);

  let result = [];

  const totalInvoices = response[0].totalInvoice ? response[0].totalInvoice[0] : 0;
  const statusResult = response[0].statusCounts || [];
  const paymentStatusResult = response[0].paymentStatusCounts || [];
  const overdueResult = response[0].overdueCounts || [];

  const statusResultMap = statusResult.map((item) => {
    return {
      ...item,
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    };
  });

  const paymentStatusResultMap = paymentStatusResult.map((item) => {
    return {
      ...item,
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    };
  });

  const overdueResultMap = overdueResult.map((item) => {
    return {
      ...item,
      status: 'overdue',
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    };
  });

  statuses.forEach((status) => {
    const found = [...paymentStatusResultMap, ...statusResultMap, ...overdueResultMap].find(
      (item) => item.status === status
    );
    if (found) {
      result.push(found);
    }
  });

  // 本期間內：已付款（paymentStatus=paid）或部份付款（unpaid 且 credit>0）之實收合計（優先 credit，否則已付清用 total）
  const paidThisMonthMatch = {
    removed: false,
    date: {
      $gte: startDate.toDate(),
      $lte: endDate.toDate(),
    },
    $or: [{ paymentStatus: 'paid' }, { paymentStatus: 'unpaid', credit: { $gt: 0 } }],
  };

  const paidThisMonthResult = await Model.aggregate([
    {
      $match: paidThisMonthMatch,
    },
    {
      $group: {
        _id: null,
        total_paid_this_month: {
          $sum: {
            $cond: [
              {
                $gt: [
                  { $convert: { input: '$credit', to: 'double', onError: 0, onNull: 0 } },
                  0,
                ],
              },
              { $convert: { input: '$credit', to: 'double', onError: 0, onNull: 0 } },
              {
                $cond: [
                  { $eq: ['$paymentStatus', 'paid'] },
                  { $convert: { input: '$total', to: 'double', onError: 0, onNull: 0 } },
                  0,
                ],
              },
            ],
          },
        },
      },
    },
  ]);

  const unpaid = await Model.aggregate([
    {
      $match: {
        removed: false,

        // date: {
        //   $gte: startDate.toDate(),
        //   $lte: endDate.toDate(),
        // },
        paymentStatus: {
          $in: ['unpaid', 'partially'],
        },
      },
    },
    {
      $group: {
        _id: null,
        total_amount: {
          $sum: {
            $subtract: ['$total', { $ifNull: ['$credit', 0] }],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total_amount: '$total_amount',
      },
    },
  ]);

  const finalResult = {
    total: totalInvoices?.total,
    total_undue: unpaid.length > 0 ? unpaid[0].total_amount : 0,
    total_paid_this_month:
      paidThisMonthResult.length > 0 ? paidThisMonthResult[0].total_paid_this_month : 0,
    type,
    performance: result,
  };

  return res.status(200).json({
    success: true,
    result: finalResult,
    message: `Successfully found all invoices for the last ${defaultType}`,
  });
};

module.exports = summary;
