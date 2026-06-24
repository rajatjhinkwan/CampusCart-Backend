const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const handleAsync = require('../utils/handleAsync');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

/* ----------------------------------
   AUTH ROUTES
----------------------------------- */

router.post('/signup', authLimiter, handleAsync(authController.signup));
router.post('/verify-otp', authLimiter, handleAsync(authController.verifyOtp));
router.post('/resend-otp', authLimiter, handleAsync(authController.resendOtp));
router.post('/google', authLimiter, handleAsync(authController.googleAuth));
router.post('/login', authLimiter, handleAsync(authController.login));

// Logout (protected)
router.post('/logout', auth.protect, handleAsync(authController.logout));

// Get Profile (protected)
router.get('/me', auth.protect, handleAsync(authController.getProfile));

// Update Profile
router.put('/updateProfile', auth.protect, handleAsync(authController.updateProfile));

// Refresh Token (reads token from body or cookie in controller)
router.post('/refresh', handleAsync(authController.refreshToken));


/* ----------------------------------
   PASSWORD RESET
----------------------------------- */

router.post('/forgot-password', authLimiter, handleAsync(authController.forgotPassword));
router.post('/reset-password/:token', authLimiter, handleAsync(authController.resetPassword));


/* ----------------------------------
   ADMIN ROUTES
----------------------------------- */

// List Users
router.get('/users', auth.protect, handleAsync(authController.listUsers));

// Delete User
router.delete('/users/:id', auth.protect, handleAsync(authController.deleteUser));

module.exports = router;
