const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const { calculateWorkDaysFromAttendance } = require('./calculateWorkDays');
const { computeSalaryTotal, getPaidLeaveAmount } = require('./salaryTotal');
const { parseHongKongDayRange, toHongKongDateKey } = require('@/helpers/hongKongMoment');

const updateAttendance = async (req, res) => {
  try {
    const { projectId, attendanceId } = req.params;
    const { checkInDate, checkInTime, checkOutTime, notes, dayType } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在',
      });
    }

    const attendanceRecord = project.onboard.id(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: '打咭記錄不存在',
      });
    }

    const contractorEmployeeId = attendanceRecord.contractorEmployee;

    let nextDateKey = toHongKongDateKey(attendanceRecord.checkInDate);
    let nextCheckInDate = attendanceRecord.checkInDate;
    if (checkInDate !== undefined && checkInDate !== null && String(checkInDate).trim() !== '') {
      const dateKey = toHongKongDateKey(checkInDate);
      const dayRange = parseHongKongDayRange(dateKey, dateKey);
      if (!dateKey || !dayRange) {
        return res.status(400).json({
          success: false,
          message: '打咭日期格式不正確',
        });
      }
      // 改日期時檢查同一員工是否已有該日記錄
      if (dateKey !== toHongKongDateKey(attendanceRecord.checkInDate)) {
        const duplicate = (project.onboard || []).find((attendance) => {
          if (String(attendance._id) === String(attendanceId)) return false;
          const empId = attendance.contractorEmployee?._id || attendance.contractorEmployee;
          return (
            String(empId) === String(contractorEmployeeId) &&
            toHongKongDateKey(attendance.checkInDate) === dateKey
          );
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `該員工在 ${dateKey} 已有打咭記錄，日期不可重複`,
          });
        }
      }
      nextDateKey = dateKey;
      nextCheckInDate = dayRange.from;
    }

    const nextCheckInTime =
      checkInTime !== undefined ? checkInTime || null : attendanceRecord.checkInTime;
    const nextCheckOutTime =
      checkOutTime !== undefined ? checkOutTime || null : attendanceRecord.checkOutTime;

    let workHours = attendanceRecord.workHours || 0;
    if (nextCheckOutTime && nextCheckInTime) {
      const checkIn = new Date(`${nextDateKey} ${nextCheckInTime}`);
      const checkOut = new Date(`${nextDateKey} ${nextCheckOutTime}`);
      workHours = Math.max(0, (checkOut - checkIn) / (1000 * 60 * 60));
    }

    let nextDayType = attendanceRecord.dayType || 'full';
    if (dayType !== undefined && dayType !== null) {
      nextDayType = String(dayType).toLowerCase() === 'half' ? 'half' : 'full';
    }

    await Project.findOneAndUpdate(
      { _id: projectId, 'onboard._id': attendanceId },
      {
        $set: {
          'onboard.$.checkInDate': nextCheckInDate,
          'onboard.$.checkInTime': nextCheckInTime,
          'onboard.$.checkOutTime': nextCheckOutTime,
          'onboard.$.workHours': workHours,
          'onboard.$.dayType': nextDayType,
          'onboard.$.notes': notes !== undefined ? notes : attendanceRecord.notes,
          'onboard.$.updated': new Date(),
        },
      }
    );

    try {
      const workDays = await calculateWorkDaysFromAttendance(projectId, contractorEmployeeId);
      const projectFresh = await Project.findById(projectId);
      const salaryRecord = (projectFresh?.salaries || []).find((salary) => {
        const id = salary.contractorEmployee?._id || salary.contractorEmployee;
        return String(id) === String(contractorEmployeeId);
      });

      if (salaryRecord) {
        const dailySalary = salaryRecord.dailySalary || 0;
        const paidLeaveAmount = getPaidLeaveAmount(salaryRecord);
        const totalSalary = computeSalaryTotal(dailySalary, workDays, paidLeaveAmount);

        await Project.findOneAndUpdate(
          { _id: projectId, 'salaries._id': salaryRecord._id },
          {
            $set: {
              'salaries.$.workDays': workDays,
              'salaries.$.totalSalary': totalSalary,
              'salaries.$.updated': new Date(),
            },
          }
        );
      }
    } catch (error) {
      console.error('計算工作天數時發生錯誤:', error);
    }

    const finalProject = await Project.findById(projectId)
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('onboard.contractorEmployee.contractor', 'name')
      .populate('salaries.contractorEmployee', 'name contractor employmentStatus resignationDate')
      .populate('salaries.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: finalProject,
      message: '打咭記錄更新成功',
    });
  } catch (error) {
    console.error('更新打咭記錄錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '更新打咭記錄失敗',
      error: error.message,
    });
  }
};

module.exports = updateAttendance;
