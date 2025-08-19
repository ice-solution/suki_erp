const mongoose = require('mongoose');
const Attendance = mongoose.model('Attendance');

const confirmAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找考勤記錄
    const attendance = await Attendance.findOne({
      _id: id,
      removed: false
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Attendance record not found',
      });
    }

    if (attendance.confirmed) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Attendance record is already confirmed',
      });
    }

    // 確認考勤記錄
    attendance.confirmed = true;
    attendance.confirmedBy = req.admin._id;
    attendance.confirmedAt = new Date();

    await attendance.save();

    // 重新填充數據
    await attendance.populate(['project', 'projectEmployee', 'createdBy', 'confirmedBy']);

    return res.status(200).json({
      success: true,
      result: attendance,
      message: 'Attendance record confirmed successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error confirming attendance record: ' + error.message,
    });
  }
};

module.exports = confirmAttendance;
