const mongoose = require('mongoose');
const Project = mongoose.model('Project');

const getAttendance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contractorEmployee, startDate, endDate } = req.query;

    // 查找項目
    const project = await Project.findById(projectId)
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('onboard.contractorEmployee.contractor', 'name');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    let attendanceRecords = project.onboard || [];

    // 如果指定了員工，過濾該員工的記錄
    if (contractorEmployee) {
      attendanceRecords = attendanceRecords.filter(
        (record) => record.contractorEmployee._id.toString() === contractorEmployee
      );
    }

    // 如果指定了日期範圍，過濾日期
    if (startDate || endDate) {
      attendanceRecords = attendanceRecords.filter((record) => {
        const recordDate = new Date(record.checkInDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && end) {
          return recordDate >= start && recordDate <= end;
        } else if (start) {
          return recordDate >= start;
        } else if (end) {
          return recordDate <= end;
        }
        return true;
      });
    }

    // 按日期排序（最新的在前）
    attendanceRecords.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));

    return res.status(200).json({
      success: true,
      result: attendanceRecords,
      message: '打咭記錄查詢成功'
    });

  } catch (error) {
    console.error('查詢打咭記錄錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '查詢打咭記錄失敗',
      error: error.message
    });
  }
};

module.exports = getAttendance;


