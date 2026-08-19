const followUpSelect = 'name surname email';

const nestedFollowUpPopulate = [
  { path: 'followUpBy', select: followUpSelect },
  { path: 'createdBy', select: followUpSelect },
];

/** 項目列表／搜尋：帶出關聯單據跟單人 */
const projectRelatedDocsPopulate = [
  {
    path: 'quotations',
    select: 'numberPrefix number year total status isCompleted invoiceNumber followUpBy createdBy',
    populate: nestedFollowUpPopulate,
  },
  {
    path: 'supplierQuotations',
    select: 'numberPrefix number year total status isCompleted invoiceNumber followUpBy createdBy',
    populate: nestedFollowUpPopulate,
  },
  {
    path: 'shipQuotations',
    select: 'numberPrefix number year total status isCompleted invoiceNumber followUpBy createdBy',
    populate: nestedFollowUpPopulate,
  },
  {
    path: 'invoices',
    select: 'invoiceNumber numberPrefix number year total status followUpBy createdBy',
    populate: nestedFollowUpPopulate,
  },
];

module.exports = { projectRelatedDocsPopulate };
