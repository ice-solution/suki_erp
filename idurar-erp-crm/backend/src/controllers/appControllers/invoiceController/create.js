const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { computeInvoiceTotals } = require('@/helpers/invoiceTotals');
const { increaseInvoiceLastNumberByPrefix } = require('@/helpers/lastNumberSettings');
const { syncInvoiceToProjectsByQuoteNumber } = require('@/helpers/syncInvoiceToProjectsByQuoteNumber');
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
  const totals = computeInvoiceTotals({
    subTotal,
    discount,
    projectPercentage: projectPct,
  });
  discountTotal = totals.discountTotal;
  total = totals.total;

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

  const invoicePrefix = String(body.numberPrefix || 'SMI').trim().toUpperCase();
  await increaseInvoiceLastNumberByPrefix(invoicePrefix);

  let projectLink = null;
  const quoteNumber = body.invoiceNumber != null ? String(body.invoiceNumber).trim() : '';
  if (quoteNumber) {
    try {
      projectLink = await syncInvoiceToProjectsByQuoteNumber(updateResult._id, quoteNumber, {
        preferredProjectId: body.linkToProjectId,
      });
    } catch (linkErr) {
      console.error('Invoice project link failed:', linkErr);
    }
  }

  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
    ...(projectLink ? { projectLink } : {}),
  });
};

module.exports = create;
