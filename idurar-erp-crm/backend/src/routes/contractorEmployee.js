const express = require('express');
const router = express.Router();
const ContractorEmployee = require('../models/appModels/ContractorEmployee');

function normalizeEmployeePayload(body) {
  const payload = { ...body };
  if (payload.phone !== undefined && String(payload.phone || '').trim() === '') {
    delete payload.phone;
    return { payload, unsetPhone: true };
  }
  return { payload, unsetPhone: false };
}

// 查詢所有承辦商員工
router.get('/', async (req, res) => {
  try {
    const employees = await ContractorEmployee.find({ removed: false })
      .populate('contractor createdBy assigned');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增承辦商員工
router.post('/', async (req, res) => {
  try {
    const { payload } = normalizeEmployeePayload(req.body);
    const employee = new ContractorEmployee(payload);
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 查詢單一承辦商員工
router.get('/:id', async (req, res) => {
  try {
    const employee = await ContractorEmployee.findById(req.params.id)
      .populate('contractor createdBy assigned');
    if (!employee || employee.removed) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新承辦商員工
router.put('/:id', async (req, res) => {
  try {
    const { payload, unsetPhone } = normalizeEmployeePayload(req.body);
    const update =
      unsetPhone && Object.keys(payload).length > 0
        ? { $set: payload, $unset: { phone: 1 } }
        : unsetPhone
          ? { $unset: { phone: 1 } }
          : payload;
    const employee = await ContractorEmployee.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 刪除承辦商員工 (軟刪除)
router.delete('/:id', async (req, res) => {
  try {
    const employee = await ContractorEmployee.findByIdAndUpdate(req.params.id, { removed: true }, { new: true });
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 根據承辦商ID查詢員工
router.get('/contractor/:contractorId', async (req, res) => {
  try {
    const employees = await ContractorEmployee.find({ 
      contractor: req.params.contractorId, 
      removed: false 
    }).populate('contractor createdBy assigned');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 