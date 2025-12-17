// controllers/userController.js
const User = require('../models/userModel');
const { uploadFromBuffer } = require('../config/cloudinary');
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Review = require('../models/reviewModel');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');

// ======================================================
// 👥 FOLLOW USER
// ======================================================
exports.followUser = async (req, res) => {
  try {
    const userToFollowId = req.params.id;
    const currentUserId = req.user._id;

    if (userToFollowId === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(userToFollowId);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.following.includes(userToFollowId)) {
      return res.status(400).json({ message: "You are already following this user" });
    }

    currentUser.following.push(userToFollowId);
    userToFollow.followers.push(currentUserId);

    await currentUser.save();
    await userToFollow.save();

    res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error following user", error: error.message });
  }
};

// ======================================================
// 👥 UNFOLLOW USER
// ======================================================
exports.unfollowUser = async (req, res) => {
  try {
    const userToUnfollowId = req.params.id;
    const currentUserId = req.user._id;

    const userToUnfollow = await User.findById(userToUnfollowId);
    const currentUser = await User.findById(currentUserId);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    currentUser.following = currentUser.following.filter(id => id.toString() !== userToUnfollowId);
    userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== currentUserId.toString());

    await currentUser.save();
    await userToUnfollow.save();

    res.status(200).json({ message: "Unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error unfollowing user", error: error.message });
  }
};

// ======================================================
// 👥 GET FOLLOWERS
// ======================================================
exports.getFollowers = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("followers", "name avatar username");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ success: true, followers: user.followers });
    } catch (error) {
        res.status(500).json({ message: "Error fetching followers", error: error.message });
    }
};

// ======================================================
// 👥 GET FOLLOWING
// ======================================================
exports.getFollowing = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("following", "name avatar username");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ success: true, following: user.following });
    } catch (error) {
        res.status(500).json({ message: "Error fetching following", error: error.message });
    }
};

// ======================================================
// 👤 GET MY PROFILE
// ======================================================
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// ======================================================
// ✏️ UPDATE MY PROFILE (with avatar upload)
// ======================================================
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const updates = { ...req.body };
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate required fields
    if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
      return res.status(400).json({ message: 'Name is required and cannot be empty' });
    }

    // 🔼 If avatar image provided
    if (req.file && req.file.buffer) {
      try {
        const uploadResult = await uploadFromBuffer(req.file.buffer, {
          folder: 'avatars',
          public_id: `${user._id}_avatar`,
          overwrite: true,
        });
        updates.avatar = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        // Continue without updating avatar, don't fail the entire request
        // Optionally, you could return a warning message
      }
    }

    // Update allowed fields only
    const allowedFields = ['name', 'phone', 'avatar', 'bio', 'location', 'username', 'institution'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === 'name' || field === 'username') {
          user[field] = updates[field].trim();
        } else {
          user[field] = updates[field];
        }
      }
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
        username: user.username,
        bio: user.bio,
        location: user.location,
        institution: user.institution,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// ======================================================
// ⚙️ GET MY SETTINGS
// ======================================================
exports.getMySettings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const user = await User.findById(userId).select('settings username bio location');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      success: true,
      settings: user.settings,
      username: user.username,
      bio: user.bio,
      location: user.location,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
};

// ======================================================
// 🛠 UPDATE SETTINGS (notifications, privacy, preferences)
// ======================================================
exports.updateMySettings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

  const {
    notifications,
    privacy,
    preferences,
    selling,
    security,
  } = req.body || {};

  // Merge with existing settings to avoid overwriting other fields
  const currentSettings = user.settings || {};

  user.settings = {
    ...currentSettings,
    notifications: { ...(currentSettings.notifications || {}), ...(notifications || {}) },
    privacy: { ...(currentSettings.privacy || {}), ...(privacy || {}) },
    preferences: { ...(currentSettings.preferences || {}), ...(preferences || {}) },
    selling: { ...(currentSettings.selling || {}), ...(selling || {}) },
    security: { ...(currentSettings.security || {}), ...(security || {}) },
  };

    await user.save();

    res.status(200).json({
      success: true,
      settings: user.settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
};

// ======================================================
// 🔑 CHANGE PASSWORD
// ======================================================
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
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

exports.adminDeleteUser = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await user.deleteOne();
  res.status(200).json({ success: true, message: 'User deleted' });
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

// ======================================================
// 📊 GET ACCOUNT METRICS (for dashboard overview)
// ======================================================
exports.getAccountMetrics = async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('profileViews');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const [activeAds, soldCount] = await Promise.all([
    Product.countDocuments({ seller: userId, isSold: false }),
    Product.countDocuments({ seller: userId, isSold: true })
  ]);

  const conversations = await Conversation.find({ participants: userId }).select('_id');
  const totalConversations = conversations.length;

  let responseRate = 0;
  if (totalConversations > 0) {
    const responded = await Message.aggregate([
      { $match: { sender: userId } },
      { $group: { _id: '$conversation' } },
      { $count: 'count' }
    ]);
    const respondedCount = responded.length ? responded[0].count : 0;
    responseRate = Math.round((respondedCount / totalConversations) * 100);
  }

  const userProducts = await Product.find({ seller: userId }).select('_id');
  const productIds = userProducts.map(p => p._id);

  let trustScore = 0;
  if (productIds.length) {
    const agg = await Review.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    trustScore = agg.length ? Number(agg[0].avg.toFixed(1)) : 0;
  }

  res.status(200).json({
    success: true,
    profileViews: user.profileViews || 0,
    activeAds,
    successfulSales: soldCount,
    responseRate,
    trustScore,
  });
};

exports.getEnvironmentSummary = async (req, res) => {
  const userId = req.user._id;
  const products = await Product.find({ seller: userId, isSold: true }).populate('category', 'title');
  const coeff = { Laptop: 200, Mobile: 70, Furniture: 100, Fashion: 25, Electronics: 120, Default: 60 };
  const harmCoeff = { Laptop: 3.0, Mobile: 1.8, Furniture: 5.0, Fashion: 0.8, Electronics: 2.5, Default: 1.0 };
  const savedFactor = 0.7;
  const avoidedHarmFactor = 0.6;
  const pickType = (p) => {
    const t = (p.title || '').toLowerCase();
    const cat = (p.category?.title || '');
    if (t.includes('laptop')) return 'Laptop';
    if (t.includes('mobile') || t.includes('phone') || t.includes('iphone') || t.includes('android')) return 'Mobile';
    if (cat && /furniture/i.test(cat)) return 'Furniture';
    if (cat && /fashion|clothing|apparel/i.test(cat)) return 'Fashion';
    if (cat && /electronic/i.test(cat)) return 'Electronics';
    return 'Default';
  };
  const byCat = {};
  const harmByCat = {};
  let totalSaved = 0;
  let wasteAvoided = 0;
  let harmNewTotal = 0;
  let harmAvoidedTotal = 0;
  for (const p of products) {
    const type = pickType(p);
    const base = coeff[type] ?? coeff.Default;
    const harmBase = harmCoeff[type] ?? harmCoeff.Default;
    const saved = p.environment?.savedCo2Kg ?? Number((base * savedFactor).toFixed(1));
    const avoidedWaste = p.environment?.avoidedWasteKg ?? Number((1.5).toFixed(1));
    const harmNew = p.environment?.harmNewKg ?? Number(harmBase.toFixed(2));
    const harmAvoided = p.environment?.harmAvoidedKg ?? Number((harmBase * avoidedHarmFactor).toFixed(2));
    byCat[type] = (byCat[type] || 0) + saved;
    harmByCat[type] = (harmByCat[type] || 0) + harmAvoided;
    totalSaved += saved;
    wasteAvoided += avoidedWaste;
    harmNewTotal += harmNew;
    harmAvoidedTotal += harmAvoided;
  }
  const chart = Object.keys(byCat).map((k) => ({ category: k, savedKgCO2: Number(byCat[k].toFixed(1)) }));
  const harmChart = Object.keys(harmByCat).map((k) => ({ category: k, avoidedKg: Number(harmByCat[k].toFixed(2)) }));
  res.status(200).json({
    success: true,
    chart,
    totalSaved: Number(totalSaved.toFixed(1)),
    wasteAvoided: Number(wasteAvoided.toFixed(1)),
    harmChart,
    harmNewTotal: Number(harmNewTotal.toFixed(2)),
    harmAvoidedTotal: Number(harmAvoidedTotal.toFixed(2)),
  });
};
