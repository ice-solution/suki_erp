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
      attendance => {
        if (!attendance.contractorEmployee) return false;
        const attendanceEmployeeId = attendance.contractorEmployee._id || attendance.contractorEmployee;
        return attendanceEmployeeId.toString() === contractorEmployeeId.toString();
      }
    );
    
    console.log(`[calculateWorkDaysFromAttendance] 項目 ${projectId}，員工 ${contractorEmployeeId} 有 ${attendanceRecords.length} 條打咭記錄`);

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

    // 只返回工作天數，不更新記錄
    // 更新記錄應該由調用者（如 updateSalary）來處理
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
      
      if (!contractorEmployeeId) {
        console.warn(`工資記錄 ${salary._id} 沒有 contractorEmployee`);
        continue;
      }

      // 查找該員工的所有打咭記錄
      const attendanceRecords = project.onboard.filter(
        attendance => {
          if (!attendance.contractorEmployee) return false;
          const attendanceEmployeeId = attendance.contractorEmployee._id || attendance.contractorEmployee;
          return attendanceEmployeeId.toString() === contractorEmployeeId.toString();
        }
      );
      
      console.log(`員工 ${contractorEmployeeId} 有 ${attendanceRecords.length} 條打咭記錄`);

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
      
      console.log(`員工 ${contractorEmployeeId}: 工作天數=${workDays}, 日薪=${dailySalary}, 總工資=${totalSalary}`);

      // 更新該員工的工作天數和總工資
      const updateResult = await Project.findOneAndUpdate(
        { _id: projectId, 'salaries._id': salary._id },
        {
          $set: {
            'salaries.$.workDays': workDays,
            'salaries.$.totalSalary': totalSalary,
            'salaries.$.updated': new Date()
          }
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
  recalculateAllWorkDays
};

