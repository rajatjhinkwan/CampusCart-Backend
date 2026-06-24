const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware'); // <-- import protect
const handleAsync = require('../utils/handleAsync');

// =========================
// 🚀 NOTIFICATION ROUTES
// =========================

router.get('/', protect, handleAsync(notificationController.getMyNotifications));
router.get('/:notificationId', protect, handleAsync(notificationController.getNotificationById));

// mark one notification as read
router.patch('/:notificationId/read', protect, handleAsync(notificationController.markOneRead));
router.patch('/:notificationId/toggle', protect, handleAsync(notificationController.toggleRead));

// mark all notifications as read
router.patch('/mark-all-read', protect, handleAsync(notificationController.markAllRead));

router.delete('/:notificationId', protect, handleAsync(notificationController.deleteNotification));

router.delete('/clear-all', protect, handleAsync(notificationController.clearAllNotifications));

router.post('/send-test', protect, handleAsync(notificationController.sendTestNotification));
module.exports = router;
