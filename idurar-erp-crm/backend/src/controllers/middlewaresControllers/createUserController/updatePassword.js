const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

const DEMO_ADMIN_EMAIL = 'admin@demo.com';

const updatePassword = async (userModel, req, res) => {
  const User = mongoose.model(userModel);
  const UserPassword = mongoose.model(userModel + 'Password');

  let { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({
      msg: 'The password needs to be at least 8 characters long.',
    });
  }

  const targetUser = await User.findOne({ _id: req.params.id, removed: false }).exec();
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'User not found',
    });
  }

  // 只保護 demo 帳號本身，唔應檢查操作者（管理員）是否 demo
  if (targetUser.email === DEMO_ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo password",
    });
  }

  const salt = uniqueId();
  const passwordHash = bcrypt.hashSync(salt + password);
  const UserPasswordData = {
    password: passwordHash,
    salt: salt,
  };

  const resultPassword = await UserPassword.findOneAndUpdate(
    { user: targetUser._id, removed: false },
    { $set: UserPasswordData },
    { new: true }
  ).exec();

  if (!resultPassword) {
    return res.status(403).json({
      success: false,
      result: null,
      message: "User Password couldn't save correctly",
    });
  }

  return res.status(200).json({
    success: true,
    result: {},
    message: 'we update the password by this id: ' + targetUser._id,
  });
};

module.exports = updatePassword;
