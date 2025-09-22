const mongoose = require('mongoose');

const Project = mongoose.model('Project');
const Quote = mongoose.model('Quote');
const SupplierQuote = mongoose.model('SupplierQuote');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  try {
    const { contractorFee, description, address, startDate, endDate, costBy, contractors } = req.body;

    // 查找現有項目
    const existingProject = await Project.findOne({ _id: req.params.id, removed: false });
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Project not found',
      });
    }

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

    const result = await Project.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      updateData,
      { new: true }
    ).populate('contractors', 'name email phone address');

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
