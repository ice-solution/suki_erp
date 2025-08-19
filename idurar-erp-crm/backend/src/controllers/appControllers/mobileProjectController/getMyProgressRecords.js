const mongoose = require('mongoose');
const WorkProgressRecord = mongoose.model('WorkProgressRecord');
const ProjectEmployee = mongoose.model('ProjectEmployee');

const getMyProgressRecords = async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const { 
      projectId, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    // 獲取員工參與的項目
    const projectEmployeeQuery = {
      employee: employeeId,
      removed: false
    };
    
    if (projectId) {
      projectEmployeeQuery.project = projectId;
    }

    const projectEmployees = await ProjectEmployee.find(projectEmployeeQuery);
    const projectEmployeeIds = projectEmployees.map(pe => pe._id);

    if (projectEmployeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        result: {
          records: [],
          pagination: {
            current: 1,
            pageSize: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        },
        message: '暫無進度記錄',
      });
    }

    // 構建查詢條件
    const query = {
      submittedBy: { $in: projectEmployeeIds },
      removed: false
    };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) query.recordDate.$gte = new Date(startDate);
      if (endDate) query.recordDate.$lte = new Date(endDate);
    }

    // 分頁查詢
    const skip = (page - 1) * limit;
    const total = await WorkProgressRecord.countDocuments(query);

    const records = await WorkProgressRecord.find(query)
      .populate({
        path: 'project',
        select: 'orderNumber projectName'
      })
      .populate({
        path: 'workProcess',
        select: 'name sequence'
      })
      .populate({
        path: 'submittedBy',
        populate: {
          path: 'employee',
          select: 'name'
        }
      })
      .sort({ recordDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 處理返回數據
    const recordsData = records.map(record => ({
      _id: record._id,
      project: record.project,
      workProcess: record.workProcess,
      recordDate: record.recordDate,
      workDescription: record.workDescription,
      completedWork: record.completedWork,
      progressIncrement: record.progressIncrement,
      hoursWorked: record.hoursWorked,
      location: record.location,
      status: record.status,
      images: record.images?.map(img => ({
        filename: img.filename,
        path: img.path,
        uploadedAt: img.uploadedAt
      })) || [],
      created: record.created
    }));

    const pagination = {
      current: parseInt(page),
      pageSize: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    };

    return res.status(200).json({
      success: true,
      result: {
        records: recordsData,
        pagination
      },
      message: `成功獲取 ${recordsData.length} 條進度記錄`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: '獲取進度記錄失敗: ' + error.message,
    });
  }
};

module.exports = getMyProgressRecords;
