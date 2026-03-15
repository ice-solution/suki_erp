const mongoose = require('mongoose');

const ShipQuoteModel = mongoose.model('ShipQuote');
const SupplierQuoteModel = mongoose.model('SupplierQuote');

const { increaseBySettingKey } = require('@/middlewares/settings');

/**
 * 將 Ship Quote 轉換為 S單（Supplier Quote）
 */
const convertToSupplierQuote = async (req, res) => {
  try {
    const shipQuote = await ShipQuoteModel.findById(req.params.id);

    if (!shipQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Ship Quote not found',
      });
    }

    // 吊船Quote 可重覆上單，不檢查是否已轉換

    if (!shipQuote.items || shipQuote.items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Ship Quote 沒有項目，無法轉換',
      });
    }

    const supplierQuoteNumberResult = await increaseBySettingKey({
      settingKey: 'last_supplier_quote_number',
    });
    const supplierQuoteNumber = supplierQuoteNumberResult
      ? supplierQuoteNumberResult.settingValue
      : 1;

    // 與 Quote 上單一致：不帶銀碼，items 只有 itemName, description, quantity
    const supplierQuoteItems = shipQuote.items.map((item) => ({
      itemName: item.itemName,
      description: item.description || '',
      quantity: item.quantity,
    }));

    const supplierQuoteData = {
      converted: false,
      numberPrefix: 'S',
      number: supplierQuoteNumber.toString(),
      year: new Date().getFullYear(),
      type: shipQuote.type || '吊船',
      shipType: shipQuote.shipType,
      subcontractorCount: shipQuote.subcontractorCount,
      costPrice: shipQuote.costPrice,
      date: new Date(),
      expiredDate: shipQuote.expiredDate,
      isCompleted: shipQuote.isCompleted,
      invoiceNumber:
        shipQuote.numberPrefix && shipQuote.number
          ? `${shipQuote.numberPrefix}-${shipQuote.number}/${shipQuote.year || ''}`
          : shipQuote.invoiceNumber,
      contactPerson: shipQuote.contactPerson,
      address: shipQuote.address,
      clients: shipQuote.clients,
      client: shipQuote.client,
      project: shipQuote.project,
      items: supplierQuoteItems,
      subTotal: 0,
      discountTotal: 0,
      total: 0,
      credit: 0,
      currency: shipQuote.currency || 'NA',
      discount: shipQuote.discount ?? 0,
      notes: shipQuote.notes,
      status: 'draft',
      createdBy: req.admin._id,
    };

    const supplierQuote = await new SupplierQuoteModel(supplierQuoteData).save();

    await ShipQuoteModel.findByIdAndUpdate(req.params.id, {
      $set: {
        'converted.supplierQuote': supplierQuote._id,
      },
    });

    return res.status(200).json({
      success: true,
      result: supplierQuote,
      message: 'Ship Quote 已成功轉換成 S單',
    });
  } catch (error) {
    console.error('Error converting ship quote to supplier quote:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '轉換失敗：' + error.message,
    });
  }
};

module.exports = convertToSupplierQuote;
