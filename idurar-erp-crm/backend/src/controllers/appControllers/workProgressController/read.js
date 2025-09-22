const mongoose = require('mongoose');

const Model = mongoose.model('WorkProgress');

const read = async (req, res) => {
  try {
    console.log('🔍 Reading WorkProgress:', req.params.id);
    
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
    })
    .populate('contractorEmployee', 'name contractor')
    .populate('project', 'name')
    .exec();

    console.log('📋 WorkProgress found:', {
      id: result?._id,
      progress: result?.progress,
      historyCount: result?.history?.length || 0,
      contractorEmployee: result?.contractorEmployee?.name
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'WorkProgress not found',
      });
    }

    return res.status(200).json({
      success: true,
      result,
      message: 'WorkProgress found successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error reading WorkProgress: ' + error.message,
    });
  }
};

module.exports = read;
