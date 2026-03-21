const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');
const ShipQuote = mongoose.model('ShipQuote');
const Invoice = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { allocateNextEoNumbers, needsAutoEo } = require('@/helpers/usedContractorFeeEoSequence');

const update = async (req, res) => {
  try {
    const { contractorFees, contractorFee, usedContractorFees, description, address, startDate, endDate, costBy, contractors, invoiceNumber, poNumber, status } = req.body;

    // 查找現有項目
    const existingProject = await Project.findOne({ _id: req.params.id, removed: false });
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Project not found',
      });
    }

    // 檢查 Invoice Number 是否改變
    const oldInvoiceNumber = existingProject.invoiceNumber;
    const newInvoiceNumber = invoiceNumber;
    const invoiceNumberChanged = oldInvoiceNumber && newInvoiceNumber && oldInvoiceNumber !== newInvoiceNumber;

    // 處理判頭費：支持新的 contractorFees 數組格式，也支持舊的 contractorFee 單一值（向後兼容）
    let totalContractorFee = 0;
    let contractorFeesArray = [];
    
    if (contractorFees !== undefined) {
      // 新格式：contractorFees 數組（projectName + amount）
      if (Array.isArray(contractorFees) && contractorFees.length > 0) {
        // 過濾有效的 fee - 必須有 projectName 和 amount
        contractorFeesArray = contractorFees.filter(fee => {
          return fee && fee.projectName !== undefined && fee.amount !== undefined;
        }).map(fee => ({
          projectName: fee.projectName || '',
          amount: fee.amount || 0,
        }));
        totalContractorFee = contractorFeesArray.reduce((sum, fee) => {
          return calculate.add(sum, fee.amount || 0);
        }, 0);
      }
      // 如果 contractorFees 是空數組，則設置為空
    } else if (contractorFee !== undefined && contractorFee !== null) {
      // 舊格式：單一 contractorFee 值（向後兼容）
      totalContractorFee = contractorFee || 0;
      if (totalContractorFee > 0) {
        // 將舊的單一值轉換為數組格式
        contractorFeesArray = [{
          projectName: '判頭費',
          amount: totalContractorFee,
        }];
      }
    } else {
      // 如果沒有提供新的值，保持現有的 contractorFees
      if (existingProject.contractorFees && Array.isArray(existingProject.contractorFees)) {
        contractorFeesArray = existingProject.contractorFees;
        totalContractorFee = contractorFeesArray.reduce((sum, fee) => {
          return calculate.add(sum, fee.amount || 0);
        }, 0);
      } else if (existingProject.contractorFee !== undefined) {
        // 向後兼容：如果有舊的 contractorFee 字段
        totalContractorFee = existingProject.contractorFee || 0;
        if (totalContractorFee > 0) {
          contractorFeesArray = [{
            projectName: '判頭費',
            amount: totalContractorFee,
          }];
        }
      }
    }
    
    // 毛利 = 成本價 - S_price - 判頭費總額
    const grossProfit = calculate.sub(
      calculate.sub(existingProject.costPrice || 0, existingProject.sPrice || 0), 
      totalContractorFee
    );

    const now = new Date();
    // 更新項目數據
    const updateData = {
      grossProfit,
      updated: now,
      modified_at: now,
    };
    if (req.admin && req.admin._id) updateData.updatedBy = req.admin._id;

    // 如果有新的 contractorFees 值，則更新它
    if (contractorFees !== undefined) {
      updateData.contractorFees = contractorFeesArray;
    }

    // 如果有新的 usedContractorFees 值，則更新它（EO 編號空白時由全站序號自動配發）
    if (usedContractorFees !== undefined) {
      let fees = Array.isArray(usedContractorFees) ? [...usedContractorFees] : [];
      fees = fees.map((f) => ({
        projectName: f && f.projectName !== undefined ? String(f.projectName) : '',
        date: f && f.date ? new Date(f.date) : new Date(),
        eoNumber:
          f && f.eoNumber !== undefined && f.eoNumber !== null ? String(f.eoNumber).trim() : '',
        amount: f && f.amount !== undefined && f.amount !== null ? f.amount : 0,
      }));
      const needIndices = [];
      fees.forEach((f, i) => {
        if (needsAutoEo(f.eoNumber)) needIndices.push(i);
      });
      if (needIndices.length > 0) {
        const nums = await allocateNextEoNumbers(needIndices.length);
        needIndices.forEach((idx, j) => {
          fees[idx].eoNumber = nums[j];
        });
      }
      updateData.usedContractorFees = fees;
    }

    // 添加可選字段
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (costBy !== undefined) updateData.costBy = costBy;
    if (status !== undefined) updateData.status = status;
    if (contractors !== undefined) updateData.contractors = contractors || [];
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (poNumber !== undefined) updateData.poNumber = poNumber;

    const result = await Project.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      updateData,
      { new: true }
    )
      .populate('contractors', 'name email phone address');

    // 如果 Invoice Number 改變了，同步更新相關的 Quote、SupplierQuote 和 Invoice
    if (invoiceNumberChanged) {
      console.log(`🔄 Invoice Number changed from ${oldInvoiceNumber} to ${newInvoiceNumber}, syncing related records...`);
      
      try {
        // 更新相關的 Quote 記錄
        // 支持兩種查找方式：1) invoiceNumber 字段直接匹配 2) numberPrefix-number 組合匹配
        // 解析 oldInvoiceNumber
        let oldNumberPrefix = null;
        let oldNumber = null;
        if (oldInvoiceNumber && oldInvoiceNumber.includes('-')) {
          const parts = oldInvoiceNumber.split('-');
          if (parts.length >= 2) {
            oldNumberPrefix = parts[0];
            oldNumber = parts.slice(1).join('-');
          }
        }

        const oldFindQuery = {
          $or: [
            { invoiceNumber: oldInvoiceNumber, removed: false }
          ]
        };
        
        if (oldNumberPrefix && oldNumber) {
          oldFindQuery.$or.push({
            numberPrefix: oldNumberPrefix,
            number: oldNumber,
            removed: false
          });
        }

        const quoteUpdateResult = await Quote.updateMany(
          oldFindQuery,
          { invoiceNumber: newInvoiceNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${quoteUpdateResult.modifiedCount} Quote records`);

        // 更新相關的 SupplierQuote 記錄
        const supplierQuoteUpdateResult = await SupplierQuote.updateMany(
          oldFindQuery,
          { invoiceNumber: newInvoiceNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${supplierQuoteUpdateResult.modifiedCount} SupplierQuote records`);

        // 更新相關的 ShipQuote 記錄
        const shipQuoteUpdateResult = await ShipQuote.updateMany(
          oldFindQuery,
          { invoiceNumber: newInvoiceNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${shipQuoteUpdateResult.modifiedCount} ShipQuote records`);

        // 更新相關的 Invoice 記錄
        const invoiceUpdateResult = await Invoice.updateMany(
          oldFindQuery,
          { invoiceNumber: newInvoiceNumber, updated: new Date() }
        );
        console.log(`✅ Updated ${invoiceUpdateResult.modifiedCount} Invoice records`);

        // 返回同步信息
        return res.status(200).json({
          success: true,
          result,
          message: 'Project updated successfully',
          invoiceNumberSync: {
            changed: true,
            oldInvoiceNumber,
            newInvoiceNumber,
            syncedRecords: {
              quotes: quoteUpdateResult.modifiedCount,
              supplierQuotes: supplierQuoteUpdateResult.modifiedCount,
              shipQuotes: shipQuoteUpdateResult.modifiedCount,
              invoices: invoiceUpdateResult.modifiedCount
            }
          }
        });

      } catch (syncError) {
        console.error('❌ Error syncing Invoice Number:', syncError);
        // 即使同步失敗，項目更新仍然成功
        return res.status(200).json({
          success: true,
          result,
          message: 'Project updated successfully, but Invoice Number sync failed',
          invoiceNumberSync: {
            changed: true,
            oldInvoiceNumber,
            newInvoiceNumber,
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
