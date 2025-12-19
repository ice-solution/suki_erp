const mongoose = require('mongoose');
const Project = mongoose.model('Project');

/**
 * 根據打咭記錄計算指定員工的工作天數
 * 工作天數 = 該員工在項目中的不同打咭日期數
 */
const calculateWorkDaysFromAttendance = async (projectId, contractorEmployeeId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('項目不存在');
    }

    // 查找該員工的所有打咭記錄
    const attendanceRecords = project.onboard.filter(
      attendance => attendance.contractorEmployee.toString() === contractorEmployeeId.toString()
    );

    // 使用 Set 來儲存不同的日期（只計算日期部分，不計算時間）
    const uniqueDates = new Set();
    attendanceRecords.forEach(attendance => {
      const checkInDate = attendance.checkInDate;
      // 確保正確處理日期對象或字符串
      const dateObj = checkInDate instanceof Date ? checkInDate : new Date(checkInDate);
      if (!isNaN(dateObj.getTime())) {
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        uniqueDates.add(dateStr);
      }
    });

    // 工作天數 = 不同日期的數量
    const workDays = uniqueDates.size;

    // 查找該員工的工資記錄
    const salaryRecord = project.salaries.find(
      salary => salary.contractorEmployee.toString() === contractorEmployeeId.toString()
    );

    if (!salaryRecord) {
      // 如果沒有工資記錄，返回計算出的天數但不更新
      return workDays;
    }

    const salaryId = salaryRecord._id;
    const dailySalary = salaryRecord.dailySalary || 0;
    const totalSalary = dailySalary * workDays;

    // 更新該員工的工作天數和總工資
    await Project.findOneAndUpdate(
      { _id: projectId, 'salaries._id': salaryId },
      {
        $set: {
          'salaries.$.workDays': workDays,
          'salaries.$.totalSalary': totalSalary,
          'salaries.$.updated': new Date()
        }
      }
    );

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

    // 為每個有工資記錄的員工計算並更新工作天數
    for (const salary of project.salaries) {
      const contractorEmployeeId = salary.contractorEmployee;

      // 查找該員工的所有打咭記錄
      const attendanceRecords = project.onboard.filter(
        attendance => attendance.contractorEmployee.toString() === contractorEmployeeId.toString()
      );

      // 使用 Set 來儲存不同的日期（只計算日期部分，不計算時間）
      const uniqueDates = new Set();
      attendanceRecords.forEach(attendance => {
        const checkInDate = attendance.checkInDate;
        // 確保正確處理日期對象或字符串
        const dateObj = checkInDate instanceof Date ? checkInDate : new Date(checkInDate);
        if (!isNaN(dateObj.getTime())) {
          const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          uniqueDates.add(dateStr);
        }
      });

      // 工作天數 = 不同日期的數量
      const workDays = uniqueDates.size;
      const dailySalary = salary.dailySalary || 0;
      const totalSalary = dailySalary * workDays;

      // 更新該員工的工作天數和總工資
      await Project.findOneAndUpdate(
        { _id: projectId, 'salaries._id': salary._id },
        {
          $set: {
            'salaries.$.workDays': workDays,
            'salaries.$.totalSalary': totalSalary,
            'salaries.$.updated': new Date()
          }
        }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('重新計算所有工作天數錯誤:', error);
    throw error;
  }
};

module.exports = {
  calculateWorkDaysFromAttendance,
  recalculateAllWorkDays
};

