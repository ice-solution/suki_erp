const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const update = async (req, res) => {
  let body = req.body;

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  const previousInvoice = await Model.findOne({
    _id: req.params.id,
    removed: false,
  });

  const { credit } = previousInvoice;

  const { items = [], discount = 0, projectPercentage: rawProjectPct } = req.body;

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

  const projectPct =
    rawProjectPct != null && rawProjectPct !== ''
      ? Math.min(100, Math.max(0, Number(rawProjectPct)))
      : 100;

  //Calculate the items array with subTotal, total, discountTotal（允許負數影響總額）
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    item['total'] = total;
    subTotal = calculate.add(subTotal, total);
  });
  discountTotal = calculate.multiply(subTotal, discount / 100);
  total = calculate.sub(subTotal, discountTotal);
  total = calculate.multiply(total, projectPct / 100);

  body['subTotal'] = subTotal;
  body['discountTotal'] = discountTotal;
  body['total'] = total;
  body['items'] = items;
  body['pdf'] = 'invoice-' + req.params.id + '.pdf';
  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  
  // 注意：invoiceNumber 是用來關聯 Quote 的，如果用戶提供了就使用，否則保持原值
  // Invoice 自己的編號是從 numberPrefix + number 生成的（用於顯示）
  
  // 優先使用用戶在表單選擇的付款狀態；未提供時才依 total 與 credit 自動計算
  const validStatuses = ['unpaid', 'paid'];
  if (req.body.paymentStatus && validStatuses.includes(req.body.paymentStatus)) {
    body['paymentStatus'] = req.body.paymentStatus;
  } else {
    body['paymentStatus'] = total === credit ? 'paid' : 'unpaid';
  }

  const now = new Date();
  body.modified_at = now;
  body.updated = now;
  if (req.admin && req.admin._id) body.updatedBy = req.admin._id;

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
