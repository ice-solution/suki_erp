const mongoose = require('mongoose');
const Project = mongoose.model('Project');

/**
 * 獲取指定時間段內的項目和人工報告
 */
const getProjectReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 驗證日期參數
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '請提供開始日期和結束日期'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 設置結束日期為當天的最後時刻
    end.setHours(23, 59, 59, 999);

    // 查找在指定時間段內創建或更新的項目
    // 條件：項目的 created 或 updated 日期在時間段內
    const projects = await Project.find({
      removed: false,
      $or: [
        {
          created: {
            $gte: start,
            $lte: end
          }
        },
        {
          updated: {
            $gte: start,
            $lte: end
          }
        }
      ]
    })
      .populate('contractors', 'name')
      .populate('salaries.contractorEmployee', 'name contractor')
      .populate('salaries.contractorEmployee.contractor', 'name')
      .sort({ created: -1 });

    // 格式化項目數據，包含人工列表
    const reportData = projects.map(project => {
      // 過濾在時間段內創建或更新的人工記錄
      const salariesInPeriod = (project.salaries || []).filter(salary => {
        const salaryCreated = salary.created ? new Date(salary.created) : null;
        const salaryUpdated = salary.updated ? new Date(salary.updated) : null;
        
        return (
          (salaryCreated && salaryCreated >= start && salaryCreated <= end) ||
          (salaryUpdated && salaryUpdated >= start && salaryUpdated <= end)
        );
      });

      return {
        _id: project._id,
        name: project.name,
        address: project.address,
        status: project.status,
        created: project.created,
        updated: project.updated,
        contractors: project.contractors || [],
        salaries: salariesInPeriod.map(salary => ({
          _id: salary._id,
          contractorEmployee: salary.contractorEmployee,
          dailySalary: salary.dailySalary,
          workDays: salary.workDays,
          totalSalary: salary.totalSalary,
          notes: salary.notes,
          created: salary.created,
          updated: salary.updated
        })),
        totalSalaries: salariesInPeriod.reduce((sum, s) => sum + (s.totalSalary || 0), 0)
      };
    });

    // 計算總計
    const totalProjects = reportData.length;
    const totalSalaries = reportData.reduce((sum, p) => sum + p.totalSalaries, 0);
    const totalEmployees = new Set(
      reportData.flatMap(p => 
        p.salaries.map(s => s.contractorEmployee?._id?.toString()).filter(Boolean)
      )
    ).size;

    return res.status(200).json({
      success: true,
      result: {
        startDate: start,
        endDate: end,
        summary: {
          totalProjects,
          totalSalaries,
          totalEmployees
        },
        projects: reportData
      },
      message: '報告生成成功'
    });

  } catch (error) {
    console.error('Error generating project report:', error);
    return res.status(500).json({
      success: false,
      message: '生成報告失敗: ' + error.message
    });
  }
};

module.exports = getProjectReport;

