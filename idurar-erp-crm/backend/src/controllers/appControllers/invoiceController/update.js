const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');
const {
  syncInvoiceNumberAcrossDocuments,
  syncProjectInvoiceNumberIfMatched,
} = require('@/helpers/syncInvoiceNumberAcrossDocuments');
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

  const previousCredit = Number(previousInvoice?.credit) || 0;

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
  
  // 多筆付款：若有 paymentEntries 則以加總 credit 作為 Invoice.credit
  let paymentEntries = Array.isArray(req.body.paymentEntries) ? req.body.paymentEntries : null;
  if (paymentEntries && paymentEntries.length) {
    const paidSum = paymentEntries.reduce((s, p) => {
      const v = p && p.credit != null && p.credit !== '' ? Number(p.credit) : 0;
      return calculate.add(s, Math.max(0, Number.isFinite(v) ? v : 0));
    }, 0);
    body['paymentEntries'] = paymentEntries;
    body['credit'] = paidSum;
  } else if (req.body.credit != null) {
    body['credit'] = Math.max(0, Number(req.body.credit) || 0);
  } else {
    body['credit'] = previousCredit;
  }

  // 優先使用用戶在表單選擇的付款狀態；未提供時才依 total 與 credit 自動計算
  const validStatuses = ['unpaid', 'paid'];
  // Full paid 一定視作已付款（避免 fullPaid=true 但 paymentStatus=unpaid 的不一致）
  if (req.body.fullPaid === true || req.body.fullPaid === 'true') {
    body['fullPaid'] = true;
    body['paymentStatus'] = 'paid';
  } else
  if (req.body.paymentStatus && validStatuses.includes(req.body.paymentStatus)) {
    body['paymentStatus'] = req.body.paymentStatus;
  } else {
    const paidSum = Number(body['credit']) || 0;
    body['paymentStatus'] = total === 0 || paidSum >= total ? 'paid' : 'unpaid';
  }

  const now = new Date();
  body.modified_at = now;
  body.updated = now;
  if (req.admin && req.admin._id) body.updatedBy = req.admin._id;

  // Quote Number（invoiceNumber）變更：先同步 Quote / S單 / 吊船 / 其他 Invoice 與專案抬頭，再寫入本筆（與 Project 更新時邏輯一致）
  const oldQuoteNo =
    previousInvoice && previousInvoice.invoiceNumber != null
      ? String(previousInvoice.invoiceNumber).trim()
      : '';
  const newQuoteNo =
    body.invoiceNumber !== undefined && body.invoiceNumber !== null
      ? String(body.invoiceNumber).trim()
      : oldQuoteNo;

  let invoiceNumberSync = null;
  if (oldQuoteNo && newQuoteNo && oldQuoteNo !== newQuoteNo) {
    try {
      const syncedCounts = await syncInvoiceNumberAcrossDocuments(oldQuoteNo, newQuoteNo);
      let projectSynced = false;
      if (previousInvoice.project) {
        projectSynced = await syncProjectInvoiceNumberIfMatched(
          previousInvoice.project,
          oldQuoteNo,
          newQuoteNo
        );
      }
      invoiceNumberSync = { syncedCounts, projectSynced };
    } catch (syncErr) {
      console.error('Invoice Quote Number sync failed:', syncErr);
      return res.status(500).json({
        success: false,
        result: null,
        message: 'Quote Number 同步失敗：' + (syncErr.message || String(syncErr)),
      });
    }
  }

  if (body.invoiceNumber !== undefined) {
    body.invoiceNumber = newQuoteNo;
  }

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
    ...(invoiceNumberSync ? { invoiceNumberSync } : {}),
  });
};

module.exports = update;
