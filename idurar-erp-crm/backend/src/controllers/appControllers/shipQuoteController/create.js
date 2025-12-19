const mongoose = require('mongoose');

const Model = mongoose.model('ShipQuote');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
  const { items = [], discount = 0 } = req.body;

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
  
  // 驗證 shipType 是否存在
  if (!body['shipType']) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Ship type is required for ship quote',
    });
  }

  // 如果沒有提供 invoiceNumber，從 numberPrefix 和 number 組合生成
  if (!body['invoiceNumber'] && body['numberPrefix'] && body['number']) {
    body['invoiceNumber'] = `${body['numberPrefix']}-${body['number']}`;
  }

  body['subTotal'] = subTotal;
  body['discountTotal'] = discountTotal;
  body['total'] = total;
  body['items'] = items;
  body['createdBy'] = req.admin._id;

  // Creating a new document in the collection
  const result = await new Model(body).save();
  const fileId = 'shipquote-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();
  // Returning successfull response

  increaseBySettingKey({
    settingKey: 'last_quote_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Ship Quote created successfully',
  });
};
module.exports = create;

