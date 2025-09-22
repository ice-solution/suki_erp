const mongoose = require('mongoose');

const Model = mongoose.model('ProjectItem');

const update = async (req, res) => {
  try {
    console.log('🔄 Updating ProjectItem:', req.params.id, req.body);
    
    const { itemName, description, price, unit, category, isFrequent, notes } = req.body;

    // 如果更改了名稱，檢查是否與其他項目重複
    if (itemName) {
      const existingItem = await Model.findOne({ 
        itemName: itemName.trim(), 
        removed: false,
        _id: { $ne: req.params.id } // 排除當前項目
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          result: null,
          message: '項目名稱已存在，請使用不同的名稱',
        });
      }
    }

    const updateData = {};
    if (itemName !== undefined) updateData.itemName = itemName.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (price !== undefined) updateData.price = Number(price);
    if (unit !== undefined) updateData.unit = unit;
    if (category !== undefined) updateData.category = category;
    if (isFrequent !== undefined) updateData.isFrequent = Boolean(isFrequent);
    if (notes !== undefined) updateData.notes = notes?.trim();

    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      updateData,
      { new: true }
    )
    .populate('createdBy', 'name')
    .exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'ProjectItem not found',
      });
    }

    console.log('✅ ProjectItem updated successfully:', result.itemName);

    return res.status(200).json({
      success: true,
      result,
      message: 'ProjectItem updated successfully',
    });

  } catch (error) {
    console.error('❌ Error updating ProjectItem:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating ProjectItem: ' + error.message,
    });
  }
};

module.exports = update;
