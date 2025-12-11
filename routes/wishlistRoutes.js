const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController'); // implemented in userController for simplicity
const { protect } = require('../middleware/authMiddleware'); // <-- use protect
const handleAsync = require('../utils/handleAsync');

// =========================
// 💖 WISHLIST ROUTES
// =========================

// Add to wishlist
router.post('/add', protect, handleAsync(wishlistController.addToWishlist));

// Remove from wishlist
router.post('/remove', protect, handleAsync(wishlistController.removeFromWishlist));

// Get my wishlist
router.get('/me', protect, handleAsync(wishlistController.getMyWishlist));

module.exports = router;
