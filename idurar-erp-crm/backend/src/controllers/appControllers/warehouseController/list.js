const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const { catchErrors } = require('../../../handlers/errorHandlers');

const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      warehouse,
      status,
      supplier,
      project,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 建立查詢條件
    const query = { removed: false };

    // 搜索條件
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // 倉庫篩選
    if (warehouse) {
      query.warehouse = warehouse;
    }

    // 狀態篩選
    if (status) {
      query.status = status;
    }

    // 供應商篩選
    if (supplier) {
      query.supplier = supplier;
    }

    // 項目篩選
    if (project) {
      query.project = project;
    }

    // 排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 執行查詢
    const [inventory, total] = await Promise.all([
      WarehouseInventory.find(query)
        .populate('supplier', 'name')
        .populate('project', 'name')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      WarehouseInventory.countDocuments(query)
    ]);

    // 計算分頁信息
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      result: inventory,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Error in warehouse inventory list:', error);
    res.status(500).json({
      success: false,
      message: '獲取存倉列表失敗',
      error: error.message
    });
  }
};

module.exports = catchErrors(list);
