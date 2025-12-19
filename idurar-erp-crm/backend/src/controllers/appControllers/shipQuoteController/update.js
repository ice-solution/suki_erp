const mongoose = require('mongoose');

const Model = mongoose.model('ShipQuote');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  const { items = [], discount = 0 } = req.body;

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
  }
  // default
  let subTotal = 0;
  let discountTotal = 0;
  let total = 0;

  //Calculate the items array with subTotal, total, discountTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
  discountTotal = calculate.multiply(subTotal, discount / 100);
  total = calculate.sub(subTotal, discountTotal);

  let body = req.body;

  // 確保 type 是 '吊船'
  body['type'] = '吊船';

  // 如果沒有提供 invoiceNumber，從 numberPrefix 和 number 組合生成
  if (!body['invoiceNumber'] && body['numberPrefix'] && body['number']) {
    body['invoiceNumber'] = `${body['numberPrefix']}-${body['number']}`;
  }

  body['subTotal'] = subTotal;
  body['discountTotal'] = discountTotal;
  body['total'] = total;
  body['items'] = items;
  body['pdf'] = 'shipquote-' + req.params.id + '.pdf';

  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  // Find document by id and updates with the required fields

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};
module.exports = update;

