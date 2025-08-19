const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');

const getAttendanceByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, employeeId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID is required',
      });
    }

    // 構建查詢條件
    const query = {
      project: projectId,
      removed: false
    };

    // 日期範圍篩選
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // 員工篩選
    if (employeeId) {
      query.projectEmployee = employeeId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate([
        'project',
        {
          path: 'projectEmployee',
          populate: {
            path: 'employee',
            model: 'ContractorEmployee'
          }
        },
        'createdBy',
        'confirmedBy'
      ])
      .sort({ date: -1, created: -1 });

    // 統計信息
    const statistics = {
      totalRecords: attendanceRecords.length,
      totalPay: attendanceRecords.reduce((sum, record) => sum + (record.totalPay || 0), 0),
      statusCount: {}
    };

    // 按狀態統計
    attendanceRecords.forEach(record => {
      const status = record.status;
      statistics.statusCount[status] = (statistics.statusCount[status] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      result: {
        records: attendanceRecords,
        statistics
      },
      message: `Successfully fetched ${attendanceRecords.length} attendance records`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching attendance records: ' + error.message,
    });
  }
};

module.exports = getAttendanceByProject;
