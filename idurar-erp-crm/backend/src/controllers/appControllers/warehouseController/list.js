const mongoose = require('mongoose');
const WarehouseInventory = require('../../../models/appModels/WarehouseInventory');
const { catchErrors } = require('../../../handlers/errorHandlers');
const { warehouseProjectPopulate } = require('../../../helpers/warehouseProjects');

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      itemName,
      warehouse,
      status,
      category,
      supplier,
      project,
      sortBy = 'warehouse',
      sortOrder = 'asc',
      stockAvailable,
    } = req.query;

    const query = { removed: false };

    // S 單選貨等場景：僅回傳可用且有庫存的貨品
    if (stockAvailable === '1' || stockAvailable === 'true') {
      query.quantity = { $gt: 0 };
      query.status = 'available';
    }

    const textQuery = (itemName && String(itemName).trim()) || (search && String(search).trim());
    if (textQuery) {
      const safe = escapeRegex(String(textQuery).trim());
      const Project = mongoose.model('Project');
      const matchingProjects = await Project.find({
        removed: false,
        invoiceNumber: { $regex: safe, $options: 'i' },
      })
        .select('_id')
        .lean();
      const projectIds = matchingProjects.map((p) => p._id);

      const orConditions = [
        { itemName: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { sku: { $regex: safe, $options: 'i' } },
        { location: { $regex: safe, $options: 'i' } },
        { siteAddress: { $regex: safe, $options: 'i' } },
      ];
      if (projectIds.length > 0) {
        orConditions.push({ project: { $in: projectIds } });
        orConditions.push({ projects: { $in: projectIds } });
      }
      query.$or = orConditions;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (status) {
      query.status = status;
    }

    if (category && String(category).trim()) {
      query.category = String(category).trim();
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (project) {
      const projectFilter = { $or: [{ project }, { projects: project }] };
      if (query.$or) {
        const searchOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: searchOr }, projectFilter];
      } else {
        Object.assign(query, projectFilter);
      }
    }

    const sort = {};
    if (sortBy === 'warehouse') {
      sort.warehouse = sortOrder === 'desc' ? -1 : 1;
      sort.sku = 1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [inventory, total] = await Promise.all([
      WarehouseInventory.find(query)
        .populate('supplier', 'name')
        .populate(warehouseProjectPopulate)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      WarehouseInventory.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit, 10));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      result: inventory,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit, 10),
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error in warehouse inventory list:', error);
    res.status(500).json({
      success: false,
      message: '獲取存倉列表失敗',
      error: error.message,
    });
  }
};

module.exports = catchErrors(list);
