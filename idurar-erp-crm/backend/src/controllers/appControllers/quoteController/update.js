const mongoose = require('mongoose');

const Model = mongoose.model('Quote');
const ProjectModel = mongoose.model('Project');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');
const assertQuoteNumberUnique = require('./assertQuoteNumberUnique');
const { pickFollowUpById } = require('@/helpers/pickFollowUpById');

const update = async (req, res) => {
  const { items = [], discount = 0 } = req.body;

  if (Object.prototype.hasOwnProperty.call(req.body, 'supplier') && !req.body.supplier) {
    req.body.supplier = null;
  }

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
  // let credit = 0;

  //Calculate the items array with subTotal, total, discountTotal（允許負數影響總額）
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    item['total'] = total;
    subTotal = calculate.add(subTotal, total);
  });
  discountTotal = calculate.multiply(subTotal, discount / 100);
  total = calculate.sub(subTotal, discountTotal);

  let body = req.body;

  body['subTotal'] = subTotal;
  body['discountTotal'] = discountTotal;
  body['total'] = total;
  body['items'] = items;
  body['pdf'] = 'quote-' + req.params.id + '.pdf';

  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  const now = new Date();
  body.modified_at = now;
  body.updated = now;
  if (req.admin && req.admin._id) body.updatedBy = req.admin._id;
  body.followUpBy = pickFollowUpById(body, req.admin._id);

  const existingTypeDoc = await Model.findOne({ _id: req.params.id, removed: false })
    .select('type')
    .lean();
  const bodyForDup = {
    ...body,
    type: body.type != null && body.type !== '' ? body.type : existingTypeDoc?.type,
  };
  if (!bodyForDup.invoiceNumber && bodyForDup.numberPrefix && bodyForDup.number) {
    bodyForDup.invoiceNumber = `${bodyForDup.numberPrefix}-${bodyForDup.number}`;
  }
  if (!body.invoiceNumber && body.numberPrefix && body.number) {
    body.invoiceNumber = `${body.numberPrefix}-${body.number}`;
  }
  const dupCheck = await assertQuoteNumberUnique(Model, bodyForDup, req.params.id);
  if (!dupCheck.ok) {
    return res.status(400).json({
      success: false,
      result: null,
      message: dupCheck.message,
    });
  }

  // Find document by id and updates with the required fields
  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // 若有更新成本價，則同步更新關聯 Project 的財務數據
  // （項目管理左上角「成本價」顯示用 Project.costPrice）
  try {
    const shouldRecalc =
      Object.prototype.hasOwnProperty.call(req.body, 'costPrice') ||
      Object.prototype.hasOwnProperty.call(req.body, 'total');
    const projectId = result?.project;
    if (shouldRecalc && projectId) {
      const project = await ProjectModel.findById(projectId)
        .populate('quotations')
        .populate('supplierQuotations')
        .populate('shipQuotations');

      if (project) {
        let costPrice = 0;
        for (const q of project.quotations || []) {
          if (q?.removed) continue;
          const price = q.costPrice !== undefined && q.costPrice !== null ? q.costPrice : q.total || 0;
          costPrice = calculate.add(costPrice, price);
        }

        for (const sq of project.shipQuotations || []) {
          if (sq?.removed) continue;
          const price = sq.costPrice !== undefined && sq.costPrice !== null ? sq.costPrice : sq.total || 0;
          costPrice = calculate.add(costPrice, price);
        }

        let sPrice = 0;
        for (const sq of project.supplierQuotations || []) {
          if (sq?.removed) continue;
          sPrice = calculate.add(sPrice, sq.total || 0);
        }

        let totalContractorFee = 0;
        if (project.contractorFees && Array.isArray(project.contractorFees)) {
          totalContractorFee = project.contractorFees.reduce(
            (sum, fee) => calculate.add(sum, fee?.amount || 0),
            0
          );
        } else if (project.contractorFee !== undefined && project.contractorFee !== null) {
          totalContractorFee = project.contractorFee || 0;
        }

        const grossProfit = calculate.sub(calculate.sub(costPrice, sPrice), totalContractorFee);

        const now = new Date();
        await ProjectModel.findByIdAndUpdate(projectId, {
          costPrice,
          sPrice,
          grossProfit,
          updated: now,
          modified_at: now,
        }).exec();
      }
    }
  } catch (syncErr) {
    // 同步失敗不阻擋 Quote 更新本身
    console.error('Quote -> Project costPrice sync failed:', syncErr);
  }

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};
module.exports = update;
