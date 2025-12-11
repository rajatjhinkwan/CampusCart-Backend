const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // <-- use protect
const admin = require('../middleware/adminMiddleware');
const handleAsync = require('../utils/handleAsync');
const upload = require('../middleware/uploadMiddleware');

// =========================
// 👤 USER ROUTES
// =========================

// Get own profile
router.get('/me', protect, handleAsync(userController.getMyProfile));

// Update own profile (with avatar upload optional)
router.put('/me', protect, upload.single('avatar'), handleAsync(userController.updateMyProfile));

// Delete own account
router.delete('/me', protect, handleAsync(userController.deleteMyAccount));

// Get any user's public profile by ID
router.get('/:userId', protect, handleAsync(userController.getUserById));

// Admin: get all users
router.get('/', protect, admin, handleAsync(userController.getAllUsers));

// Admin: ban or unban user
router.patch('/:userId/ban', protect, admin, handleAsync(userController.banUser));

// Wishlist routes proxied to user controller for convenience
router.get('/:userId/wishlist', protect, handleAsync(userController.getUserWishlist));

module.exports = router;
