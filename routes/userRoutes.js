const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // <-- use protect
const admin = require('../middleware/adminMiddleware');
const handleAsync = require('../utils/handleAsync');
const upload = require('../middleware/uploadMiddleware');
const { paymentService } = require('../services');

// =========================
// 👤 USER ROUTES
// =========================

// Get own profile
router.get('/me', protect, handleAsync(userController.getMyProfile));

// Get and update settings
router.get('/me/settings', protect, handleAsync(userController.getMySettings));
router.put('/me/settings', protect, handleAsync(userController.updateMySettings));

// Update own profile (with avatar upload optional)
router.put('/me', protect, upload.single('avatar'), handleAsync(userController.updateMyProfile));

// Change password
router.put('/me/password', protect, handleAsync(userController.changePassword));

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

// Account metrics for dashboard
router.get('/account-metrics', protect, handleAsync(userController.getAccountMetrics));

// =========================
// 💳 PREMIUM CHECKOUT (Stripe)
// =========================
router.post('/premium/checkout', protect, handleAsync(async (req, res) => {
  // price for premium (₹199 per month example)
  const priceCents = Number(process.env.PREMIUM_PRICE_CENTS || 19900);
  const successUrl = `${process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5174'}/settings?premium=success`;
  const cancelUrl = `${process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5174'}/settings?premium=cancel`;

  if (!paymentService || !paymentService.stripe) {
    return res.status(503).json({ message: 'Payments are not configured. Please set STRIPE_SECRET_KEY in .env' });
  }

  const session = await paymentService.createCheckoutSession({
    priceCents,
    currency: 'inr',
    successUrl,
    cancelUrl,
    metadata: { title: 'Premium Subscription', userId: req.user.id },
    customerEmail: req.user.email || null,
  });

  res.status(200).json({ id: session.id, url: session.url });
}));

module.exports = router;
