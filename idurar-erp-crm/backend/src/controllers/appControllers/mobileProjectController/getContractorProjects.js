const mongoose = require('mongoose');

// 獲取contractor的項目列表
const getContractorProjects = async (req, res) => {
  try {
    const contractorId = req.contractor._id;
    
    console.log('🔍 查找contractor的項目:', contractorId);
    
    // 查找該contractor參與的所有項目
    const Project = mongoose.model('Project');
    const projects = await Project.find({
      contractors: contractorId,
      removed: false
    })
    .populate('contractors', 'name')
    .populate('suppliers', 'name')
    .sort({ created: -1 });
    
    console.log('📋 找到項目數量:', projects.length);
    
    // 為每個項目載入WorkProgress統計
    const projectsWithStats = await Promise.all(projects.map(async (project) => {
      const WorkProgress = mongoose.model('WorkProgress');
      
      // 獲取該項目的WorkProgress統計
      const workProgressStats = await WorkProgress.aggregate([
        {
          $match: {
            project: project._id,
            removed: false
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            inProgress: {
              $sum: {
                $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
              }
            },
            averageProgress: { $avg: '$progress' }
          }
        }
      ]);
      
      const stats = workProgressStats[0] || { total: 0, completed: 0, inProgress: 0, averageProgress: 0 };
      
      return {
        ...project.toObject(),
        workProgressStats: {
          total: stats.total,
          completed: stats.completed,
          inProgress: stats.inProgress,
          averageProgress: Math.round(stats.averageProgress || 0)
        }
      };
    }));
    
    return res.status(200).json({
      success: true,
      result: {
        projects: projectsWithStats
      },
      message: '獲取項目列表成功'
    });
    
  } catch (error) {
    console.error('❌ 獲取contractor項目失敗:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取項目列表失敗: ' + error.message
    });
  }
};

module.exports = getContractorProjects;
