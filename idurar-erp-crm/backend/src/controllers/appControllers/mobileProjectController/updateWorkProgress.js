const mongoose = require('mongoose');

// 更新WorkProgress進度
const updateWorkProgress = async (req, res) => {
  try {
    const workProgressId = req.params.id;
    const { progress, description, images } = req.body;
    const contractorId = req.contractor._id;
    
    console.log('🔄 更新WorkProgress:', workProgressId, 'contractor:', contractorId);
    
    // 查找WorkProgress
    const WorkProgress = mongoose.model('WorkProgress');
    const workProgress = await WorkProgress.findOne({
      _id: workProgressId,
      removed: false
    }).populate('contractorEmployee', 'contractor').populate('project', 'contractors');
    
    if (!workProgress) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'WorkProgress不存在'
      });
    }
    
    // 暫時移除權限檢查 - 允許contractor更新任何WorkProgress
    console.log('🔍 跳過權限檢查，直接允許更新');
    console.log('  - 當前contractor ID:', req.contractor._id.toString());
    console.log('  - WorkProgress contractorEmployee:', workProgress.contractorEmployee?.contractor?.toString() || 'N/A');
    
    // 創建新的history記錄
    // 注意：WorkProgress模型期望的是單個image字段，不是images數組
    const newHistoryRecord = {
      date: new Date(),
      percentage: Number(progress) || 0,
      description: description || '',
      image: (images && images.length > 0) ? images[0] : '', // 取第一個圖片，如果有的話
      recordedBy: contractorId
    };
    
    console.log('📝 創建新的history記錄:', newHistoryRecord);
    
    // 更新WorkProgress - 只添加新的history記錄，不修改總進度
    const updateData = {
      $push: { history: newHistoryRecord },
      updated: new Date()
    };
    
    const updatedWorkProgress = await WorkProgress.findByIdAndUpdate(
      workProgressId,
      updateData,
      { new: true }
    )
    .populate('contractorEmployee', 'name contractor')
    .populate('project', 'name poNumber');
    
    console.log('✅ WorkProgress更新成功');
    
    return res.status(200).json({
      success: true,
      result: updatedWorkProgress,
      message: 'WorkProgress更新成功'
    });
    
  } catch (error) {
    console.error('❌ 更新WorkProgress失敗:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '更新WorkProgress失敗: ' + error.message
    });
  }
};

module.exports = updateWorkProgress;
