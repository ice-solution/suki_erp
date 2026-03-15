const mongoose = require('mongoose');

const Model = mongoose.model('WorkProgress');

const update = async (req, res) => {
  try {
    console.log('🔄 WorkProgress update request body:', req.body);
    
    const { 
      contractorEmployee, // 更新為單個員工
      days,
      notes,
      status,
      progress,
      history,
      startDate,
      expectedEndDate,
      completionDate, // 添加完工日期
      actualEndDate,
      // 舊版本支持
      newProgressEntry
    } = req.body;

    let updateData = {};

    // 基本字段更新
    if (contractorEmployee !== undefined) updateData.contractorEmployee = contractorEmployee;
    if (days !== undefined) updateData.days = days;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (expectedEndDate !== undefined) updateData.expectedEndDate = expectedEndDate;
    if (completionDate !== undefined) updateData.completionDate = completionDate; // 添加完工日期更新
    if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate;

    // 歷史記錄更新
    if (history !== undefined) {
      console.log('📝 Updating history:', history);
      
      // 處理history數據，確保每個記錄都有正確的格式
      const processedHistory = history.map(record => {
        const processedRecord = {
          description: record.description,
          percentage: Number(record.percentage),
          date: record.date ? new Date(record.date) : new Date(),
          image: record.image || '',
        };
        
        // 設置recordedBy，如果沒有提供則使用當前用戶
        if (record.recordedBy && record.recordedBy !== 'current_user' && record.recordedBy !== null) {
          processedRecord.recordedBy = record.recordedBy;
        } else {
          processedRecord.recordedBy = req.admin._id;
        }
        
        return processedRecord;
      });
      
      console.log('📝 Processed history:', processedHistory);
      updateData.history = processedHistory;
    }

    // 兼容舊版本的進度記錄添加方式
    if (newProgressEntry) {
      const workProgress = await Model.findById(req.params.id);
      
      if (!workProgress) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'WorkProgress not found',
        });
      }

      // 計算新的累計進度
      const newCumulativeProgress = Math.min(100, workProgress.progress + newProgressEntry.percentage);
      
      // 添加新的歷史記錄
      const historyEntry = {
        image: newProgressEntry.image || '',
        description: newProgressEntry.description,
        percentage: newProgressEntry.percentage,
        date: new Date(),
        recordedBy: req.admin._id,
        cumulativeProgress: newCumulativeProgress
      };

      updateData.history = [...(workProgress.history || []), historyEntry];
      updateData.progress = newCumulativeProgress;
      
      // 如果達到100%，標記為完成
      if (newCumulativeProgress >= 100) {
        updateData.status = 'completed';
        updateData.actualEndDate = new Date();
      } else if (newCumulativeProgress > 0) {
        updateData.status = 'in_progress';
      }
    }

    // 更新預期結束日期（如果提供了days但沒有直接提供expectedEndDate）
    if (days !== undefined && expectedEndDate === undefined) {
      const workProgress = await Model.findById(req.params.id);
      if (workProgress && workProgress.startDate) {
        updateData.expectedEndDate = new Date(workProgress.startDate.getTime() + (days * 24 * 60 * 60 * 1000));
      }
    }

    const now = new Date();
    updateData.modified_at = now;
    updateData.updated = now;
    if (req.admin && req.admin._id) updateData.updatedBy = req.admin._id;

    console.log('📤 Update data to be saved:', updateData);

    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      updateData,
      { new: true }
    ).populate('contractorEmployee', 'name contractor')
    .populate('project', 'name')
    .exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'WorkProgress not found',
      });
    }

    console.log('✅ WorkProgress updated successfully:', {
      id: result._id,
      progress: result.progress,
      historyCount: result.history ? result.history.length : 0
    });

    return res.status(200).json({
      success: true,
      result,
      message: 'WorkProgress updated successfully',
    });

  } catch (error) {
    console.error('Error updating WorkProgress:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating WorkProgress: ' + error.message,
    });
  }
};

module.exports = update;
