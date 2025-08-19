const mongoose = require('mongoose');
const ProjectEmployee = mongoose.model('ProjectEmployee');
const Project = mongoose.model('Project');

const getMyProjects = async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const { status = 'active', page = 1, limit = 20 } = req.query;

    // 查找員工參與的項目
    const projectEmployees = await ProjectEmployee.find({
      employee: employeeId,
      status: status,
      removed: false
    }).populate({
      path: 'project',
      populate: {
        path: 'client',
        select: 'name'
      }
    }).sort({ joinDate: -1 });

    // 提取項目信息
    const projects = projectEmployees.map(pe => {
      const project = pe.project;
      return {
        _id: project._id,
        orderNumber: project.orderNumber,
        projectName: project.projectName,
        description: project.description,
        client: project.client,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        priority: project.priority,
        progress: project.progress || 0,
        
        // 員工在項目中的角色信息
        employeeRole: {
          position: pe.position,
          joinDate: pe.joinDate,
          hourlyRate: pe.hourlyRate,
          responsibilities: pe.responsibilities,
          status: pe.status
        }
      };
    }).filter(p => p._id); // 過濾掉空項目

    // 分頁處理
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProjects = projects.slice(startIndex, endIndex);

    // 統計信息
    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'in_progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      pending: projects.filter(p => p.status === 'pending').length,
    };

    return res.status(200).json({
      success: true,
      result: {
        projects: paginatedProjects,
        stats,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total: projects.length,
          totalPages: Math.ceil(projects.length / limit)
        }
      },
      message: `成功獲取 ${paginatedProjects.length} 個項目`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取項目列表失敗: ' + error.message,
    });
  }
};

module.exports = getMyProjects;
