const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const { toHongKongDateKey } = require('@/helpers/hongKongMoment');
const { computeSalaryTotal, getPaidLeaveAmount } = require('./salaryTotal');

/** 單筆打咭：全日=1，半日=0.5；缺省／mobile 視為全日 */
function getAttendanceDayValue(attendance) {
  return String(attendance?.dayType || 'full').toLowerCase() === 'half' ? 0.5 : 1;
}

/**
 * 根據打咭記錄計算指定員工的工作天數
 * 全日計 1 天，半日計 0.5 天（同一日僅一筆）
 */
const calculateWorkDaysFromAttendance = async (projectId, contractorEmployeeId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('項目不存在');
    }

    const attendanceRecords = project.onboard.filter((attendance) => {
      if (!attendance.contractorEmployee) return false;
      const attendanceEmployeeId = attendance.contractorEmployee._id || attendance.contractorEmployee;
      return attendanceEmployeeId.toString() === contractorEmployeeId.toString();
    });

    console.log(
      `[calculateWorkDaysFromAttendance] 項目 ${projectId}，員工 ${contractorEmployeeId} 有 ${attendanceRecords.length} 條打咭記錄`
    );

    // 同一日若理論上有多筆，取該日最大值（全日優先於半日）
    const dayByDate = new Map();
    attendanceRecords.forEach((attendance) => {
      const dateStr = toHongKongDateKey(attendance.checkInDate);
      if (!dateStr) return;
      const value = getAttendanceDayValue(attendance);
      const prev = dayByDate.get(dateStr) || 0;
      if (value > prev) dayByDate.set(dateStr, value);
    });

    let workDays = 0;
    dayByDate.forEach((v) => {
      workDays += v;
    });
    return workDays;
  } catch (error) {
    console.error('計算工作天數錯誤:', error);
    throw error;
  }
};

/**
 * 重新計算項目中所有員工的工作天數
 */
const recalculateAllWorkDays = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('項目不存在');
    }

    for (const salary of project.salaries) {
      const contractorEmployeeId = salary.contractorEmployee;

      if (!contractorEmployeeId) {
        console.warn(`工資記錄 ${salary._id} 沒有 contractorEmployee`);
        continue;
      }

      const workDays = await calculateWorkDaysFromAttendance(projectId, contractorEmployeeId);
      const dailySalary = salary.dailySalary || 0;
      const paidLeaveAmount = getPaidLeaveAmount(salary);
      const totalSalary = computeSalaryTotal(dailySalary, workDays, paidLeaveAmount);

      console.log(
        `員工 ${contractorEmployeeId}: 工作天數=${workDays}, 有薪假期=${paidLeaveAmount}, 日薪=${dailySalary}, 總工資=${totalSalary}`
      );

      const updateResult = await Project.findOneAndUpdate(
        { _id: projectId, 'salaries._id': salary._id },
        {
          $set: {
            'salaries.$.workDays': workDays,
            'salaries.$.totalSalary': totalSalary,
            'salaries.$.updated': new Date(),
          },
        }
      );

      if (!updateResult) {
        console.warn(`無法更新工資記錄 ${salary._id}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('重新計算所有工作天數錯誤:', error);
    throw error;
  }
};

module.exports = {
  calculateWorkDaysFromAttendance,
  recalculateAllWorkDays,
  getAttendanceDayValue,
};
