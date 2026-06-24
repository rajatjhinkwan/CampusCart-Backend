const Notification = require('../models/notificationModel');
const handleAsync = require('../utils/handleAsync');

function buildLink(type, resourceId) {
  if (!resourceId) return '';
  if (type === 'product') return `/product/${resourceId}`;
  if (type === 'room') return `/rooms/${resourceId}`;
  if (type === 'service') return `/services/${resourceId}`;
  if (type === 'job') return `/jobs/${resourceId}`;
  return '';
}

exports.createNotification = handleAsync(async (req, res) => {
  const { user, type, event, title, message, resourceId, link, meta } = req.body;
  const computedLink = link || buildLink(type, resourceId);
  const n = await Notification.create({ user, type, event, title, message, resourceId, link: computedLink, meta });
  const io = req.app.get('io');
  if (io) io.to(user.toString()).emit('notification', n);
  res.status(201).json(n);
});

exports.getMyNotifications = handleAsync(async (req, res) => {
  const { status, type, q: search } = req.query;
  const query = { user: req.user.id };
  if (status === 'unread') query.isRead = false;
  if (status === 'read') query.isRead = true;
  if (type) query.type = type;
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { message: regex }];
  }
  const items = await Notification.find(query).sort({ createdAt: -1 }).limit(200);
  res.json(items);
});

exports.getNotificationById = handleAsync(async (req, res) => {
  const item = await Notification.findOne({ _id: req.params.notificationId, user: req.user.id });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

exports.markAllRead = handleAsync(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
  res.json({ success: true });
});

exports.markOneRead = handleAsync(async (req, res) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, user: req.user.id },
    { isRead: true },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

exports.toggleRead = handleAsync(async (req, res) => {
  const item = await Notification.findOne({ _id: req.params.notificationId, user: req.user.id });
  if (!item) return res.status(404).json({ message: 'Not found' });
  item.isRead = !item.isRead;
  await item.save();
  res.json(item);
});

exports.deleteNotification = handleAsync(async (req, res) => {
  const del = await Notification.findOneAndDelete({ _id: req.params.notificationId, user: req.user.id });
  if (!del) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true });
});

exports.clearAllNotifications = handleAsync(async (req, res) => {
  await Notification.deleteMany({ user: req.user.id });
  res.json({ success: true });
});

exports.sendTestNotification = handleAsync(async (req, res) => {
  const userId = req.user?._id;
  const nowText = req.body?.notification || `${new Date().toISOString()}`;
  const n = await Notification.create({
    user: userId,
    type: 'system',
    event: 'general',
    title: 'Test Notification',
    message: nowText,
    link: '',
  });
  res.status(201).json(n);
});
