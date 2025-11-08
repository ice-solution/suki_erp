const mongoose = require('mongoose');

// 獲取項目的WorkProgress列表
const getProjectWorkProgress = async (req, res) => {
  try {
    const { projectId } = req.params;
    const contractorId = req.contractor._id;
    
    console.log('🔍 查找項目的WorkProgress:', projectId, 'contractor:', contractorId);
    
    // 驗證項目是否屬於該contractor
    const Project = mongoose.model('Project');
    const project = await Project.findOne({
      _id: projectId,
      contractors: contractorId,
      removed: false
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '項目不存在或您無權限訪問'
      });
    }
    
    // 獲取該項目的所有WorkProgress
    const WorkProgress = mongoose.model('WorkProgress');
    const workProgressList = await WorkProgress.find({
      project: projectId,
      removed: false
    })
    .populate('contractorEmployee', 'name contractor')
    .populate('project', 'name invoiceNumber poNumber')
    .sort({ created: -1 });
    
    console.log('📋 找到WorkProgress數量:', workProgressList.length);
    
    return res.status(200).json({
      success: true,
      result: {
        project: {
          _id: project._id,
          name: project.name,
          invoiceNumber: project.invoiceNumber,
          poNumber: project.poNumber,
          description: project.description
        },
        workProgressList
      },
      message: '獲取WorkProgress列表成功'
    });
    
  } catch (error) {
    console.error('❌ 獲取項目WorkProgress失敗:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取WorkProgress列表失敗: ' + error.message
    });
  }
};

module.exports = getProjectWorkProgress;


