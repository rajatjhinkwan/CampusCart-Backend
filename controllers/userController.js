// controllers/userController.js
const User = require('../models/userModel');
const { uploadFromBuffer } = require('../config/cloudinary');
const mongoose = require('mongoose');

// ======================================================
// 👤 GET MY PROFILE
// ======================================================
exports.getMyProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({
    success: true,
    message: 'User profile fetched successfully',
    user,
  });
};

// ======================================================
// ✏️ UPDATE MY PROFILE (with avatar upload)
// ======================================================
exports.updateMyProfile = async (req, res) => {
  const updates = { ...req.body };
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // 🔼 If avatar image provided
  if (req.file && req.file.buffer) {
    const uploadResult = await uploadFromBuffer(req.file.buffer, {
      folder: 'avatars',
      public_id: `${user._id}_avatar`,
      overwrite: true,
    });
    updates.avatar = uploadResult.secure_url;
  }

  // Update allowed fields only
  const allowedFields = ['name', 'phone', 'avatar'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) user[field] = updates[field];
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
    },
  });
};

// ======================================================
// 🗑️ DELETE MY ACCOUNT
// ======================================================
exports.deleteMyAccount = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Your account has been deleted successfully.',
  });
};

// ======================================================
// 🔍 GET USER BY ID (Public Profile)
// ======================================================
exports.getUserById = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  const user = await User.findById(userId)
    .select('name email avatar role listings wishlist')
    .populate('listings', 'title price')
    .populate('wishlist', 'title price');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({
    success: true,
    message: 'User profile fetched successfully',
    user,
  });
};

// ======================================================
// 🧾 ADMIN: GET ALL USERS
// ======================================================
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
};

// ======================================================
// 🚫 ADMIN: BAN OR UNBAN USER
// ======================================================
exports.banUser = async (req, res) => {
  const { userId } = req.params;
  const { action } = req.body; // expects "ban" or "unban"

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (action === 'ban') {
    user.role = 'banned';
  } else if (action === 'unban') {
    user.role = 'buyer';
  } else {
    return res.status(400).json({ message: 'Invalid action. Use "ban" or "unban".' });
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: `User has been ${action === 'ban' ? 'banned' : 'unbanned'} successfully`,
    user: { _id: user._id, name: user.name, role: user.role },
  });
};

// ======================================================
// 💖 GET USER WISHLIST
// ======================================================
exports.getUserWishlist = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  const user = await User.findById(userId).populate('wishlist', 'title price images');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({
    success: true,
    wishlistCount: user.wishlist.length,
    wishlist: user.wishlist,
  });
};
