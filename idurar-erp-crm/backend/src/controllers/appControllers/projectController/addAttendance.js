const mongoose = require('mongoose');
const Project = mongoose.model('Project');
const { calculateWorkDaysFromAttendance } = require('./calculateWorkDays');

const addAttendance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contractorEmployee, checkInDate, checkInTime, checkOutTime, notes } = req.body;

    // 驗證必填字段
    if (!contractorEmployee || !checkInDate) {
      return res.status(400).json({
        success: false,
        message: '員工和打咭日期為必填字段'
      });
    }

    // 查找項目
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 檢查是否已經有該員工在該日期的打咭記錄
    const existingAttendance = project.onboard.find(
      (attendance) => 
        attendance.contractorEmployee.toString() === contractorEmployee &&
        attendance.checkInDate.toDateString() === new Date(checkInDate).toDateString()
    );

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: '該員工在該日期已有打咭記錄'
      });
    }

    // 計算工作時數（如果提供了時間）
    let workHours = 0;
    if (checkOutTime && checkInTime) {
      const checkIn = new Date(`${checkInDate} ${checkInTime}`);
      const checkOut = new Date(`${checkInDate} ${checkOutTime}`);
      workHours = (checkOut - checkIn) / (1000 * 60 * 60); // 轉換為小時
      workHours = Math.max(0, workHours); // 確保不為負數
    }

    // 創建新的打咭記錄
    const newAttendance = {
      contractorEmployee,
      checkInDate: new Date(checkInDate),
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      workHours,
      notes: notes || '',
      created: new Date(),
      updated: new Date()
    };

    // 使用 $push 直接更新 onboard 數組，避免重新驗證整個項目
    await Project.findByIdAndUpdate(
      projectId,
      { $push: { onboard: newAttendance } },
      { new: true }
    );

    // 根據打咭記錄自動計算並更新該員工的工作天數
    // 注意：必須在 $push 之後重新查詢項目，以獲取最新的 onboard 數據
    try {
      console.log(`[addAttendance] 開始計算員工 ${contractorEmployee} 的工作天數`);
      const workDays = await calculateWorkDaysFromAttendance(projectId, contractorEmployee);
      console.log(`[addAttendance] 計算結果：工作天數 = ${workDays}`);
      
      // 重新查詢項目以獲取最新的數據（包含剛剛添加的打咭記錄）
      const projectWithNewAttendance = await Project.findById(projectId)
        .populate('salaries.contractorEmployee', 'name contractor')
        .populate('salaries.contractorEmployee.contractor', 'name');
      
      // 查找該員工的工資記錄並更新
      if (projectWithNewAttendance && projectWithNewAttendance.salaries) {
        const salaryRecord = projectWithNewAttendance.salaries.find(
          salary => {
            const salaryEmployeeId = salary.contractorEmployee._id || salary.contractorEmployee;
            return salaryEmployeeId.toString() === contractorEmployee.toString();
          }
        );
        
        if (salaryRecord) {
          const dailySalary = salaryRecord.dailySalary || 0;
          const totalSalary = dailySalary * workDays;
          
          console.log(`[addAttendance] 找到工資記錄，日薪=${dailySalary}，更新工作天數=${workDays}，總工資=${totalSalary}`);
          
          const updateResult = await Project.findOneAndUpdate(
            { _id: projectId, 'salaries._id': salaryRecord._id },
            {
              $set: {
                'salaries.$.workDays': workDays,
                'salaries.$.totalSalary': totalSalary,
                'salaries.$.updated': new Date()
              }
            },
            { new: true }
          );
          
          if (updateResult) {
            console.log(`[addAttendance] 工資記錄更新成功`);
          } else {
            console.warn(`[addAttendance] 工資記錄更新失敗，找不到記錄`);
          }
        } else {
          console.warn(`[addAttendance] 未找到員工 ${contractorEmployee} 的工資記錄，無法更新工作天數`);
        }
      } else {
        console.warn(`[addAttendance] 項目沒有 salaries 數據`);
      }
    } catch (error) {
      console.error('[addAttendance] 計算工作天數時發生錯誤:', error);
      console.error(error.stack);
      // 即使計算失敗，打咭記錄仍已添加成功，所以繼續返回成功響應
    }

    // 重新查詢項目以獲取最新的 salaries 數據
    const finalProject = await Project.findById(projectId)
      .populate('onboard.contractorEmployee', 'name contractor')
      .populate('onboard.contractorEmployee.contractor', 'name')
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name');

    return res.status(200).json({
      success: true,
      result: finalProject,
      message: '打咭記錄添加成功'
    });

  } catch (error) {
    console.error('添加打咭記錄錯誤:', error);
    return res.status(500).json({
      success: false,
      message: '添加打咭記錄失敗',
      error: error.message
    });
  }
};

module.exports = addAttendance;


