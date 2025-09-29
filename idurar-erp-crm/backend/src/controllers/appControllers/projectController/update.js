const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const Invoice = mongoose.model('Invoice');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  try {
    const { contractorFee, description, address, startDate, endDate, costBy, contractors, poNumber } = req.body;

    // 查找現有項目
    const existingProject = await Project.findOne({ _id: req.params.id, removed: false });
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Project not found',
      });
    }

    // 檢查 P.O Number 是否改變
    const oldPoNumber = existingProject.poNumber;
    const newPoNumber = poNumber;
    const poNumberChanged = oldPoNumber && newPoNumber && oldPoNumber !== newPoNumber;

    // 重新計算成本和毛利（如果判頭費改變了）
    const newContractorFee = contractorFee !== undefined ? contractorFee : existingProject.contractorFee;
    
    // 毛利 = 成本價 - S_price - 判頭費
    const grossProfit = calculate.sub(
      calculate.sub(existingProject.costPrice, existingProject.sPrice), 
      newContractorFee
    );

    // 更新項目數據
    const updateData = {
      contractorFee: newContractorFee,
      grossProfit,
      updated: new Date(),
    };

    // 添加可選字段
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (costBy !== undefined) updateData.costBy = costBy;
    if (contractors !== undefined) updateData.contractors = contractors || [];
    if (poNumber !== undefined) updateData.poNumber = poNumber;

    const result = await Project.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      updateData,
      { new: true }
    ).populate('contractors', 'name email phone address');

    // 如果 P.O Number 改變了，同步更新相關的 Quote、SupplierQuote 和 Invoice
    if (poNumberChanged) {
      console.log(`🔄 P.O Number changed from ${oldPoNumber} to ${newPoNumber}, syncing related records...`);
      
      try {
        // 更新相關的 Quote 記錄
        const quoteUpdateResult = await Quote.updateMany(
          { poNumber: oldPoNumber, removed: false },
          { poNumber: newPoNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${quoteUpdateResult.modifiedCount} Quote records`);

        // 更新相關的 SupplierQuote 記錄
        const supplierQuoteUpdateResult = await SupplierQuote.updateMany(
          { poNumber: oldPoNumber, removed: false },
          { poNumber: newPoNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${supplierQuoteUpdateResult.modifiedCount} SupplierQuote records`);

        // 更新相關的 Invoice 記錄
        const invoiceUpdateResult = await Invoice.updateMany(
          { poNumber: oldPoNumber, removed: false },
          { poNumber: newPoNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${invoiceUpdateResult.modifiedCount} Invoice records`);

        // 返回同步信息
        return res.status(200).json({
          success: true,
          result,
          message: 'Project updated successfully',
          poNumberSync: {
            changed: true,
            oldPoNumber,
            newPoNumber,
            syncedRecords: {
              quotes: quoteUpdateResult.modifiedCount,
              supplierQuotes: supplierQuoteUpdateResult.modifiedCount,
              invoices: invoiceUpdateResult.modifiedCount
            }
          }
        });

      } catch (syncError) {
        console.error('❌ Error syncing P.O Number:', syncError);
        // 即使同步失敗，項目更新仍然成功
        return res.status(200).json({
          success: true,
          result,
          message: 'Project updated successfully, but P.O Number sync failed',
          poNumberSync: {
            changed: true,
            oldPoNumber,
            newPoNumber,
            syncError: syncError.message
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      result,
      message: 'Project updated successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating project: ' + error.message,
    });
  }
};

module.exports = update;
