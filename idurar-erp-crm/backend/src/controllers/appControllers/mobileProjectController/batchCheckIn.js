const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const { calculateWorkDaysFromAttendance } = require('../projectController/calculateWorkDays');

/**
 * 批量打咭 - 為多個員工在同一天打咭
 */
const batchCheckIn = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { employeeIds, checkInDate, checkInTime, checkOutTime, notes } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇至少一個員工'
      });
    }

    if (!checkInDate) {
      return res.status(400).json({
        success: false,
        message: '請選擇打咭日期'
      });
    }

    const contractorId = req.contractor._id;
    const ContractorEmployee = mongoose.model('ContractorEmployee');

    // 查找項目並驗證該 contractor 是否有權限訪問此項目
    const project = await Project.findOne({
      _id: projectId,
      contractors: contractorId,
      removed: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在或您無權限訪問此項目'
      });
    }

    // 驗證所有員工都屬於該 contractor
    const employees = await ContractorEmployee.find({
      _id: { $in: employeeIds },
      contractor: contractorId,
      removed: false,
      enabled: true
    });

    if (employees.length !== employeeIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分員工不存在或不屬於該承辦商'
      });
    }

    const checkInDateObj = new Date(checkInDate);
    const dateStr = checkInDateObj.toISOString().split('T')[0]; // YYYY-MM-DD

    // 計算工作時數（如果提供了時間）
    let workHours = 0;
    if (checkOutTime && checkInTime) {
      const checkIn = new Date(`${checkInDate} ${checkInTime}`);
      const checkOut = new Date(`${checkInDate} ${checkOutTime}`);
      workHours = (checkOut - checkIn) / (1000 * 60 * 60); // 轉換為小時
      workHours = Math.max(0, workHours); // 確保不為負數
    }

    const results = [];
    const errors = [];

    // 為每個員工創建打咭記錄（使用 $push 直接寫入 DB，與後台 addAttendance 一致）
    for (const employeeId of employeeIds) {
      try {
        // 檢查是否已經有該員工在該日期的打咭記錄
        const existingAttendance = project.onboard.find(
          (attendance) =>
            attendance.contractorEmployee.toString() === employeeId.toString() &&
            new Date(attendance.checkInDate).toISOString().split('T')[0] === dateStr
        );

        if (existingAttendance) {
          errors.push({
            employeeId,
            message: '該員工在此日期已有打咭記錄'
          });
          continue;
        }

        // 創建新的打咭記錄
        const newAttendance = {
          contractorEmployee: new mongoose.Types.ObjectId(employeeId),
          checkInDate: checkInDateObj,
          checkInTime: checkInTime || null,
          checkOutTime: checkOutTime || null,
          workHours,
          notes: notes || '',
          created: new Date(),
          updated: new Date()
        };

        // 使用 $push 直接寫入 DB（確保即時反映到 project read）
        await Project.findByIdAndUpdate(
          projectId,
          { $push: { onboard: newAttendance } }
        );
        results.push({
          employeeId,
          success: true
        });
      } catch (error) {
        errors.push({
          employeeId,
          message: error.message
        });
      }
    }

    // 為每個成功打咭的員工計算工作天數並更新 salaries（workDays、totalSalary）
    for (const result of results) {
      try {
        const workDays = await calculateWorkDaysFromAttendance(projectId, result.employeeId);
        const projectWithSalaries = await Project.findById(projectId)
          .populate('salaries.contractorEmployee', 'name contractor')
          .lean();
        const salaryRecord = (projectWithSalaries?.salaries || []).find(
          (s) => {
          const empId = s.contractorEmployee?._id || s.contractorEmployee;
          return empId && empId.toString() === result.employeeId.toString();
        }
        );
        if (salaryRecord) {
          const dailySalary = salaryRecord.dailySalary || 0;
          const totalSalary = dailySalary * workDays;
          await Project.findOneAndUpdate(
            { _id: projectId, 'salaries._id': salaryRecord._id },
            { $set: { 'salaries.$.workDays': workDays, 'salaries.$.totalSalary': totalSalary, 'salaries.$.updated': new Date() } }
          );
        }
      } catch (error) {
        console.error(`計算員工 ${result.employeeId} 工作天數失敗:`, error);
      }
    }

    // 重新查詢項目以獲取最新數據
    const updatedProject = await Project.findById(projectId)
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee', 'name contractor');

    return res.status(200).json({
      success: true,
      result: {
        project: updatedProject,
        successCount: results.length,
        errorCount: errors.length,
        errors
      },
      message: `成功為 ${results.length} 個員工打咭`
    });

  } catch (error) {
    console.error('批量打咭失敗:', error);
    return res.status(500).json({
      success: false,
      message: '批量打咭失敗: ' + error.message
    });
  }
};

module.exports = batchCheckIn;

