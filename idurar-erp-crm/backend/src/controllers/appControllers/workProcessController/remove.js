const mongoose = require('mongoose');
const WorkProcess = mongoose.model('WorkProcess');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找工序
    const workProcess = await WorkProcess.findOne({
      _id: id,
      removed: false
    });

    if (!workProcess) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Work process not found',
      });
    }

    // 檢查是否有其他工序依賴此工序
    const dependentProcesses = await WorkProcess.find({
      dependencies: id,
      removed: false
    });

    if (dependentProcesses.length > 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Cannot delete work process that has dependent processes',
      });
    }

    // 軟刪除
    workProcess.removed = true;
    await workProcess.save();

    return res.status(200).json({
      success: true,
      result: workProcess,
      message: 'Work process deleted successfully',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting work process: ' + error.message,
    });
  }
};

module.exports = remove;
