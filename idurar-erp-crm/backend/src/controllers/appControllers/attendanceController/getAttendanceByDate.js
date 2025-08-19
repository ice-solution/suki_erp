const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');

const getAttendanceByDate = async (req, res) => {
  try {
    const { projectId, date } = req.params;

    if (!projectId || !date) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Project ID and date are required',
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendanceRecords = await Attendance.find({
      project: projectId,
      date: attendanceDate,
      removed: false
    })
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
    .sort({ created: -1 });

    return res.status(200).json({
      success: true,
      result: attendanceRecords,
      message: `Successfully fetched ${attendanceRecords.length} attendance records for ${date}`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching attendance records: ' + error.message,
    });
  }
};

module.exports = getAttendanceByDate;
