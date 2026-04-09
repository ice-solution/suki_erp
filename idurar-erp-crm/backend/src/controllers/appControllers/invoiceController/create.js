const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');
const schema = require('./schemaValidate');

const create = async (req, res) => {
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

  const { items = [], discount = 0, projectPercentage: rawProjectPct } = value;

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

  // 注意：invoiceNumber 是用來關聯 Quote 的，如果用戶沒有提供，不自動計算
  // Invoice 自己的編號是從 numberPrefix + number 生成的（用於顯示）

  // 多筆付款：若有 paymentEntries 則以加總 credit 作為 Invoice.credit
  let paymentEntries = Array.isArray(body.paymentEntries) ? body.paymentEntries : [];
  if (!paymentEntries.length) {
    // 舊資料相容：把舊欄位視作 1 筆
    paymentEntries = [
      {
        paymentStatus: body.paymentStatus,
        paymentDueDate: body.paymentDueDate,
        paymentTerms: body.paymentTerms,
        credit: body.credit,
        paidDate: body.paidDate,
      },
    ];
  }
  const paidSum = paymentEntries.reduce((s, p) => {
    const v = p && p.credit != null && p.credit !== '' ? Number(p.credit) : 0;
    return calculate.add(s, Math.max(0, Number.isFinite(v) ? v : 0));
  }, 0);
  body['paymentEntries'] = paymentEntries;
  body['credit'] = paidSum;

  const autoPaymentStatus = total === 0 || paidSum >= total ? 'paid' : 'unpaid';
  body['paymentStatus'] = autoPaymentStatus;
  body['createdBy'] = req.admin._id;

  // Creating a new document in the collection
  const result = await new Model(body).save();
  const fileId = 'invoice-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();
  // Returning successfull response

  increaseBySettingKey({
    settingKey: 'last_invoice_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
  });
};

module.exports = create;
