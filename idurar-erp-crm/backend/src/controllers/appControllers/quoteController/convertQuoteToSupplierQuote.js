const mongoose = require('mongoose');

const QuoteModel = mongoose.model('Quote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');
const ProjectModel = mongoose.model('Project');

const { increaseSupplierQuoteLastNumberByPrefix } = require('@/middlewares/settings');

const convertQuoteToSupplierQuote = async (req, res) => {
  try {
    // Find the quote by id
    const quote = await QuoteModel.findById(req.params.id);
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    // 檢查 Project Management 是否已建立此 Quote Number
    const quoteNumber = quote.numberPrefix && quote.number
      ? `${quote.numberPrefix}-${quote.number}`
      : quote.invoiceNumber;
    if (quoteNumber) {
      const project = await ProjectModel.findOne({ invoiceNumber: quoteNumber, removed: false });
      if (!project) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '請先在 Project Management 建立此 Quote Number 的項目，方可上單',
        });
      }
    }

    // Check if quote is already converted to supplier quote
    // 檢查 converted.supplierQuote 是否存在（因為 converted.to 可能只支持 'invoice'）
    if (quote.converted && quote.converted.supplierQuote) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Quote has already been converted to supplier quote',
      });
    }

    // 獲取 P.O number 參數
    const poNumber = req.query.poNumber;
    if (!poNumber) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'P.O number is required',
      });
    }

    // 過濾出指定 P.O number 的 items
    const filteredItems = quote.items.filter(item => item.poNumber === poNumber);
    
    if (filteredItems.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `No items found with P.O number: ${poNumber}`,
      });
    }

    // Create supplier quote data from quote
    // 注意：items 中的 poNumber 和 price 不需要傳遞到 SupplierQuote
    // SupplierQuote 的 items 只需要 itemName, description, quantity
    const supplierQuoteItems = filteredItems.map(item => ({
      itemName: item.itemName,
      description: item.description,
      quantity: item.quantity,
      // 不包含 price 和 total，因為 SupplierQuote 不需要 item 的價錢
    }));

    // 映射 Quote 的 numberPrefix 到 SupplierQuote 的有效值（預設 S）
    let supplierQuotePrefix = 'S';
    if (quote.numberPrefix) {
      if (quote.numberPrefix === 'SML') {
        supplierQuotePrefix = 'S';
      } else {
        supplierQuotePrefix = 'S';
      }
    }

    const supplierQuoteNumberResult = await increaseSupplierQuoteLastNumberByPrefix(supplierQuotePrefix);
    const supplierQuoteNumber = supplierQuoteNumberResult
      ? supplierQuoteNumberResult.settingValue
      : 1;

    const supplierQuoteData = {
      converted: false, // SupplierQuote 的 converted 是 Boolean 類型
      numberPrefix: supplierQuotePrefix, // 使用映射後的值
      number: supplierQuoteNumber.toString(),
      year: new Date().getFullYear(),
      type: quote.type,
      shipType: quote.shipType,
      subcontractorCount: quote.subcontractorCount,
      costPrice: quote.costPrice,
      date: new Date(), // Supplier Quote date是今天
      expiredDate: quote.expiredDate,
      isCompleted: quote.isCompleted,
      invoiceNumber: quote.numberPrefix && quote.number ? `${quote.numberPrefix}-${quote.number}` : quote.invoiceNumber,
      contactPerson: quote.contactPerson,
      address: quote.address,
      clients: quote.clients,
      client: quote.client, // 向後兼容
      project: quote.project,
      items: supplierQuoteItems,
      // 只帶 items，不帶金額：轉成 S單後 subTotal、total 為 0，由材料及費用再計算
      subTotal: 0,
      discountTotal: 0,
      total: 0,
      credit: 0,
      currency: quote.currency,
      discount: 0,
      notes: quote.notes,
      status: 'draft', // Supplier Quote初始狀態為draft
      createdBy: req.admin._id,
    };

    // Create new supplier quote
    const supplierQuote = await new SupplierQuoteModel(supplierQuoteData).save();
    
    // Update quote as converted
    // 注意：Quote 的 converted 字段可能已經有 to: 'invoice'，我們需要處理多個轉換
    // 如果已經轉換成 invoice，我們仍然可以轉換成 supplier quote
    // 使用 $set 來添加 converted.supplierQuote 字段，即使 converted 不存在也會自動創建
    await QuoteModel.findByIdAndUpdate(req.params.id, {
      $set: {
        'converted.supplierQuote': supplierQuote._id,
      },
    });

    return res.status(200).json({
      success: true,
      result: supplierQuote,
      message: 'Quote converted to Supplier Quote successfully',
    });
  } catch (error) {
    console.error('Error converting quote to supplier quote:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error converting quote to supplier quote: ' + error.message,
    });
  }
};

module.exports = convertQuoteToSupplierQuote;

