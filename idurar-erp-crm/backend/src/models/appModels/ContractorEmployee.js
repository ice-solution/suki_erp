const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  name: {
    type: String,
    required: true,
  },
  contractor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Contractor',
    required: true,
    autopopulate: true,
  },
  phone: {
    type: String,
    required: false,
    set(v) {
      if (v == null || String(v).trim() === '') return undefined;
      return String(v).trim();
    },
    validate: {
      validator: function (v) {
        if (v == null || v === '') return true;
        return /^(\+852|852)?[5-9]\d{7}$|^(\+886|886)?09\d{8}$|^09\d{8}$|^[5-9]\d{7}$/.test(v);
      },
      message: '請輸入有效的手機號碼',
    },
  },
  email: String,
  position: String,
  /** 在職狀態（與帳號 isActive 分開） */
  employmentStatus: {
    type: String,
    enum: ['在職', '離職'],
    default: '在職',
  },

  // 添加登入相關欄位
  hashedPassword: {
    type: String,
    select: false, // 默認不返回密碼
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  modified_at: { type: Date },
  updatedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
});

// 添加索引（電話選填：有填寫時才參與唯一性，避免多筆空值衝突）
schema.index({ phone: 1 }, { unique: true, sparse: true });
schema.index({ contractor: 1, removed: 1 });

// 虛擬欄位：是否被鎖定
schema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 方法：比較密碼
schema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  if (!this.hashedPassword) return false;
  return await bcrypt.compare(candidatePassword, this.hashedPassword);
};

// 方法：設置密碼
schema.methods.setPassword = async function(password) {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.hashedPassword = await bcrypt.hash(password, salt);
};

// 方法：增加登入嘗試次數
schema.methods.incLoginAttempts = function() {
  // 如果有上次的鎖定時間且還沒過期
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 如果達到最大嘗試次數且目前沒有鎖定，則設置鎖定時間
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000, // 鎖定2小時
    };
  }
  
  return this.updateOne(updates);
};

// 方法：重置登入嘗試
schema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    },
    $set: {
      lastLogin: Date.now()
    }
  });
};

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ContractorEmployee', schema); 