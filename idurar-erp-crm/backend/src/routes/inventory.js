const express = require('express');
const router = express.Router();

const Inventory = require('../models/Inventory');
const InventoryRecord = require('../models/InventoryRecord');
const adminAuth = require('../controllers/coreControllers/adminAuth');

module.exports = router;

// 入庫 API
router.post('/inbound', adminAuth.isValidAuthToken, async (req, res) => {
  try {
    const { billNumber, date, items } = req.body;
    if (!billNumber || !date || !Array.isArray(items)) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    const results = [];
    const recordItems = [];
    for (const item of items) {
      const { sku, name, unit, cost, quantity } = item;
      if (!sku || !name || !unit || !cost || !quantity) {
        continue; // 跳過不完整資料
      }
      let inventory = await Inventory.findOne({ sku });
      if (inventory) {
        inventory.unit = unit;
        inventory.cost = cost;
        inventory.quantity = (inventory.quantity || 0) + quantity;
        await inventory.save();
      } else {
        inventory = new Inventory({ sku, name, unit, cost, quantity });
        await inventory.save();
      }
      recordItems.push({ item: inventory._id, unit: quantity, type: 'in' });
      results.push(inventory);
    }
    // 建立一筆入庫記錄
    await InventoryRecord.create({
      billNumber: billNumber,
      date,
      owner: req.admin ? req.admin._id : null,
      items: recordItems
    });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢所有庫存
router.get('/', async (req, res) => {
  try {
    const inventories = await Inventory.find();
    res.json(inventories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢所有入庫記錄
router.get('/record', async (req, res) => {
  try {
    const records = await InventoryRecord.find()
      .populate('items.item')
      .populate('owner');
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});