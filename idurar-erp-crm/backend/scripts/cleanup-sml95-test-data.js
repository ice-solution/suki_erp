/**
 * 一次性整理 SML-95 測試資料（可重複執行，具 idempotent 性質）
 * 用法：node scripts/cleanup-sml95-test-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const TEST_PROJECT_ID = '69eb2157e79a81d6a586acc4';
const KEEP_PROJECT_ID = '6a157a7d6ff0cc2b29b65796';
const SHIP_QUOTE_SML94_ID = '69eb2097e79a81d6a586a8d2';
const QUOTE_SML95_ID = '69f844890b6e0193b16def06';

async function main() {
  await mongoose.connect(process.env.DATABASE);
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const Quote = mongoose.model('Quote', new mongoose.Schema({}, { strict: false }));
  const ShipQuote = mongoose.model('ShipQuote', new mongoose.Schema({}, { strict: false }));
  const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
  const SupplierQuote = mongoose.model('SupplierQuote', new mongoose.Schema({}, { strict: false }));

  const testProject = await Project.findById(TEST_PROJECT_ID);
  const keepProject = await Project.findById(KEEP_PROJECT_ID);
  if (!keepProject) {
    throw new Error('保留項目 SML-95 不存在');
  }

  // 1. 修正吊船報價 SML-94 的 Quote Number（不應填 SML-95）
  await ShipQuote.updateOne(
    { _id: SHIP_QUOTE_SML94_ID },
    {
      $set: {
        invoiceNumber: 'SML-94',
        project: KEEP_PROJECT_ID,
        updated: new Date(),
      },
    }
  );
  console.log('✓ 吊船報價 SML-94 invoiceNumber 改為 SML-94');

  // 2. 報價單 SML-95 指向保留項目
  await Quote.updateOne(
    { _id: QUOTE_SML95_ID },
    { $set: { project: KEEP_PROJECT_ID, updated: new Date() } }
  );
  console.log('✓ 報價單 SML-95 關聯到保留項目');

  // 3. 所有引用測試項目的單據改指向保留項目
  await Promise.all([
    Quote.updateMany({ project: TEST_PROJECT_ID }, { $set: { project: KEEP_PROJECT_ID } }),
    ShipQuote.updateMany({ project: TEST_PROJECT_ID }, { $set: { project: KEEP_PROJECT_ID } }),
    Invoice.updateMany({ project: TEST_PROJECT_ID }, { $set: { project: KEEP_PROJECT_ID } }),
    SupplierQuote.updateMany({ project: TEST_PROJECT_ID }, { $set: { project: KEEP_PROJECT_ID } }),
  ]);
  console.log('✓ 單據 project 欄位已從測試項目轉移');

  // 4. 合併發票列表到保留項目
  const testInvoices = testProject ? testProject.invoices || [] : [];
  const keepInvoices = keepProject.invoices || [];
  const mergedInvoices = [
    ...new Set([...keepInvoices.map(String), ...testInvoices.map(String)]),
  ];
  await Project.updateOne(
    { _id: KEEP_PROJECT_ID },
    {
      $set: {
        invoices: mergedInvoices,
        updated: new Date(),
        modified_at: new Date(),
      },
    }
  );
  console.log(`✓ 保留項目合併發票 ${mergedInvoices.length} 張`);

  // 5. 同步保留項目的報價／吊船列表（移除重複、確保 SML-95 quote 在內）
  const keep = await Project.findById(KEEP_PROJECT_ID);
  const quotationIds = [...new Set((keep.quotations || []).map(String))];
  if (!quotationIds.includes(QUOTE_SML95_ID)) {
    quotationIds.push(QUOTE_SML95_ID);
  }
  const shipIds = [...new Set((keep.shipQuotations || []).map(String))];
  if (!shipIds.includes(SHIP_QUOTE_SML94_ID)) {
    shipIds.push(SHIP_QUOTE_SML94_ID);
  }
  await Project.updateOne(
    { _id: KEEP_PROJECT_ID },
    {
      $set: {
        quotations: quotationIds,
        shipQuotations: shipIds,
        updated: new Date(),
      },
    }
  );

  // 6. 軟刪除測試項目
  if (testProject && !testProject.removed) {
    await Project.updateOne(
      { _id: TEST_PROJECT_ID },
      { $set: { removed: true, updated: new Date(), modified_at: new Date() } }
    );
    console.log('✓ 已刪除測試項目「吊船qoute testing」');
  } else {
    console.log('— 測試項目已不存在或已刪除');
  }

  const remaining = await Project.find({ invoiceNumber: 'SML-95', removed: { $ne: true } }).select('name').lean();
  console.log('\n剩餘 SML-95 項目:', remaining.map((p) => p.name).join(', ') || '(無)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
