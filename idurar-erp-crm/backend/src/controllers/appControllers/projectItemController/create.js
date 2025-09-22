const mongoose = require('mongoose');

const Model = mongoose.model('ProjectItem');

const create = async (req, res) => {
  try {
    console.log('🔄 Creating ProjectItem:', req.body);
    
    const { itemName, description, price, unit, category, isFrequent, notes } = req.body;

    // 檢查是否已存在同名項目
    const existingItem = await Model.findOne({ 
      itemName: itemName.trim(), 
      removed: false 
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '項目名稱已存在，請使用不同的名稱',
      });
    }

    const projectItemData = {
      itemName: itemName.trim(),
      description: description?.trim(),
      price: Number(price),
      unit: unit || '個',
      category: category || '建材',
      isFrequent: Boolean(isFrequent),
      notes: notes?.trim(),
      createdBy: req.admin._id,
    };

    const result = await new Model(projectItemData).save();

    console.log('✅ ProjectItem created successfully:', result.itemName);

    return res.status(200).json({
      success: true,
      result,
      message: 'ProjectItem created successfully',
    });

  } catch (error) {
    console.error('❌ Error creating ProjectItem:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating ProjectItem: ' + error.message,
    });
  }
};

module.exports = create;
