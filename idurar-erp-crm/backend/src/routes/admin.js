const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');
const { catchErrors } = require('@/handlers/errorHandlers');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');
const adminAuth = require('../controllers/coreControllers/adminAuth');

// 所有路由需登入
router.use(adminAuth.isValidAuthToken);

// 查詢所有登入帳號（不含已刪除）
router.get('/', catchErrors(async (req, res) => {
  const admins = await Admin.find({ removed: false })
    .select('email name surname role enabled created')
    .sort({ created: -1 })
    .lean();
  return res.status(200).json({
    success: true,
    result: admins,
    message: 'Success',
  });
}));

// 搜尋登入帳號（給前端 AutoComplete 使用）
// Query: q, fields (e.g. name,email)
router.get('/search', catchErrors(async (req, res) => {
  const q = req.query.q;
  const fields = req.query.fields;
  if (q === undefined || q === null || String(q).trim() === '') {
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found',
    });
  }
  const fieldsArray = String(fields || 'name,email')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const or = fieldsArray.map((f) => ({ [f]: { $regex: regex } }));

  const results = await Admin.find({ removed: false, $or: or })
    .select('email name surname role enabled created')
    .sort({ created: -1 })
    .limit(10)
    .lean();

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  }
  return res.status(202).json({
    success: false,
    result: [],
    message: 'No document found',
  });
}));

// 新增登入帳號（需提供密碼）
router.post('/', catchErrors(async (req, res) => {
  const { email, name, surname, role, password } = req.body;
  if (!email || !name) {
    return res.status(400).json({
      success: false,
      result: null,
      message: '請填寫 Email 與姓名',
    });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      result: null,
      message: '密碼至少 8 個字元',
    });
  }
  const existing = await Admin.findOne({ email: email.toLowerCase().trim(), removed: false });
  if (existing) {
    return res.status(409).json({
      success: false,
      result: null,
      message: '此 Email 已被使用',
    });
  }
  const admin = await Admin.create({
    email: email.toLowerCase().trim(),
    name: (name || '').trim(),
    surname: (surname || '').trim(),
    role: role || 'user',
    enabled: true,
    removed: false,
  });
  const salt = uniqueId();
  const passwordHash = bcrypt.hashSync(salt + password);
  await AdminPassword.create({
    user: admin._id,
    password: passwordHash,
    salt,
    removed: false,
  });
  const result = await Admin.findById(admin._id)
    .select('email name surname role enabled created')
    .lean();
  return res.status(201).json({
    success: true,
    result,
    message: '帳號已建立',
  });
}));

// 編輯登入帳號
router.put('/:id', catchErrors(async (req, res) => {
  const { email, name, surname, role, enabled } = req.body;
  const admin = await Admin.findOne({ _id: req.params.id, removed: false });
  if (!admin) {
    return res.status(404).json({
      success: false,
      result: null,
      message: '找不到該帳號',
    });
  }
  if (email !== undefined) admin.email = email.toLowerCase().trim();
  if (name !== undefined) admin.name = name.trim();
  if (surname !== undefined) admin.surname = (surname || '').trim();
  if (role !== undefined) admin.role = role;
  if (enabled !== undefined) admin.enabled = !!enabled;
  admin.modified_at = new Date();
  if (req.admin && req.admin._id) admin.updatedBy = req.admin._id;
  await admin.save();
  const result = await Admin.findById(admin._id)
    .select('email name surname role enabled created')
    .lean();
  return res.status(200).json({
    success: true,
    result,
    message: '已更新',
  });
}));

// 軟刪除帳號
router.delete('/:id', catchErrors(async (req, res) => {
  const admin = await Admin.findOne({ _id: req.params.id, removed: false });
  if (!admin) {
    return res.status(404).json({
      success: false,
      result: null,
      message: '找不到該帳號',
    });
  }
  admin.removed = true;
  await admin.save();
  const adminPassword = await AdminPassword.findOne({ user: admin._id, removed: false });
  if (adminPassword) {
    adminPassword.removed = true;
    await adminPassword.save();
  }
  return res.status(200).json({
    success: true,
    result: null,
    message: '帳號已刪除',
  });
}));

module.exports = router; 