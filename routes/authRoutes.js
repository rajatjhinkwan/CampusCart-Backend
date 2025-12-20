const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const handleAsync = require('../utils/handleAsync');

/* ----------------------------------
   AUTH ROUTES
----------------------------------- */

// Register (Send OTP)
router.post('/signup', handleAsync(authController.signup));

// Verify OTP
router.post('/verify-otp', handleAsync(authController.verifyOtp));

// Google Auth
router.post('/google', handleAsync(authController.googleAuth));

// Login
router.post('/login', handleAsync(authController.login));

// Logout (protected)
router.post('/logout', auth.protect, handleAsync(authController.logout));

// Get Profile (protected)
router.get('/me', auth.protect, handleAsync(authController.getProfile));

// Update Profile
router.put('/updateProfile', auth.protect, handleAsync(authController.updateProfile));

// Refresh Token
router.post('/refresh', auth.refreshProtect, handleAsync(authController.refreshToken));


/* ----------------------------------
   PASSWORD RESET
----------------------------------- */

// Forgot Password
router.post('/forgot-password', handleAsync(authController.forgotPassword));

// Reset Password
router.post('/reset-password/:token', handleAsync(authController.resetPassword));


/* ----------------------------------
   ADMIN ROUTES
----------------------------------- */

// List Users
router.get('/users', auth.protect, handleAsync(authController.listUsers));

// Delete User
router.delete('/users/:id', auth.protect, handleAsync(authController.deleteUser));

module.exports = router;
