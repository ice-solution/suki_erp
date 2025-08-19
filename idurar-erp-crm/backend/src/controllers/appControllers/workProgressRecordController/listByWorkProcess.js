const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');

const listByWorkProcess = async (req, res) => {
  try {
    const { workProcessId } = req.params;
    const { status, submittedBy, startDate, endDate } = req.query;

    if (!workProcessId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Work process ID is required',
      });
    }

    // 構建查詢條件
    const query = {
      workProcess: workProcessId,
      removed: false
    };

    if (status) query.status = status;
    if (submittedBy) query.submittedBy = submittedBy;

    // 日期範圍篩選
    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) {
        query.recordDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.recordDate.$lte = new Date(endDate);
      }
    }

    const progressRecords = await WorkProgressRecord.find(query)
      .populate([
        'workProcess',
        'project',
        {
          path: 'submittedBy',
          populate: {
            path: 'employee',
            model: 'ContractorEmployee'
          }
        },
        'reviewedBy'
      ])
      .sort({ recordDate: -1, created: -1 });

    // 統計信息
    const statistics = {
      total: progressRecords.length,
      submitted: 0,
      approved: 0,
      rejected: 0,
      draft: 0,
      totalHours: 0,
      totalProgressIncrement: 0,
      totalImages: 0
    };

    progressRecords.forEach(record => {
      // 狀態統計
      statistics[record.status]++;
      
      // 工時統計
      statistics.totalHours += record.hoursWorked || 0;
      
      // 進度增量統計
      statistics.totalProgressIncrement += record.progressIncrement || 0;
      
      // 圖片統計
      statistics.totalImages += record.images?.length || 0;
    });

    return res.status(200).json({
      success: true,
      result: {
        records: progressRecords,
        statistics
      },
      message: `Successfully fetched ${progressRecords.length} progress records`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching progress records: ' + error.message,
    });
  }
};

module.exports = listByWorkProcess;
