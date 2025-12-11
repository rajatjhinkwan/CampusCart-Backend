// controllers/notificationController.js
const Notification = require('../models/notificationModel');
const handleAsync = require('../utils/handleAsync');

// Story: notifications are short letters you store when something important happens.

exports.createNotification = handleAsync(async (req, res) => {
  // admin or services call this: { user, title, body, link }
  const { user, title, body, link, type } = req.body;
  const n = await Notification.create({ user, title, body, link, type });
  // push via socket if present
  const io = req.app.get('io');
  if (io) io.to(user.toString()).emit('notification', n);
  res.status(201).json(n);
});

exports.getMyNotifications = handleAsync(async (req, res) => {
  const items = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
  res.json(items);
});

exports.markAllRead = handleAsync(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ message: 'All marked read' });
});

// Mark a single notification as read
exports.markOneRead = async (req, res) => {
  const userId = req.user._id; // comes from auth middleware
  const { notificationId } = req.params;

  // Step 1️⃣: Check if the notification exists and belongs to this user
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  // Step 2️⃣: Mark as read
  notification.isRead = true;
  await notification.save();

  // Step 3️⃣: Send response
  res.status(200).json({
    message: "✅ Notification marked as read",
    notification,
  });
};



// implement markAllRead


exports.sendTestNotification = handleAsync(async (req, res) => {
  const userId = req.user?._id; // safe access

  // FIX: Safe handling of req.body
  const notification = req.body?.notification
    || `${new Date().toISOString()} - This is a test notification`;

  const testNotification = await Notification.create({
    user: userId,
    type: "message",
    message: notification,
    link: "/test-link",
  });

  res.status(201).json(testNotification);
});
