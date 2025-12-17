// controllers/authController.js
const User = require('../models/userModel');
const handleAsync = require('../utils/handleAsync');
const { generateToken } = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail.js"); // assume a helper for sending emails
const Token = require("../models/tokenModel.js"); // for storing refresh/reset tokens



const NotificationManager = require('../services/notificationManager');

exports.signup = handleAsync(async (req, res) => {
  const { name, email, password, role } = req.body;

  console.log("🟡 Signup attempt for email:", email);

  // 1️⃣ Validate input
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // 2️⃣ Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("🔴 Email already exists:", email);
    return res.status(400).json({ message: "Email already registered" });
  }

  // 3️⃣ Create new user
  const user = await User.create({ 
    name, 
    email, 
    password, 
    role,
    isVerified: false // Default to false
  });
  console.log("🟢 User created successfully:", user._id);

  // 4️⃣ Generate Verification Token (reuse randomBytes logic)
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const hashedVerifyToken = crypto.createHash("sha256").update(verifyToken).digest("hex");

  // Save verification token
  await Token.create({
    userId: user._id,
    token: hashedVerifyToken,
    purpose: "emailVerification",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  // 🔔 Send Welcome + Verification Email
  const verifyURL = `${req.protocol}://${req.get("host")}/verify-email?token=${verifyToken}`;
  
  NotificationManager.notify(user, 'welcome', { 
    name: user.name, 
    verifyLink: verifyURL 
  }, { sendEmail: true, sendSms: false })
    .catch(err => console.error("Failed to send welcome/verify notification:", err));

  // 4️⃣ Generate access token - pass user object, not just ID
  const accessToken = generateToken(user);

  console.log("🟢 Access token generated");

  // 5️⃣ Generate refresh token
  const jwt = require("jsonwebtoken");
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  console.log("🟢 Refresh token generated");

  // 6️⃣ Save refresh token in DB
  const Token = require("../models/tokenModel.js");
  try {
    const savedToken = await Token.create({
      userId: user._id,
      token: refreshToken,
      purpose: "refreshToken",
    });
    console.log("✅ Refresh token saved in DB:", savedToken._id);
  } catch (err) {
    console.error("❌ Error storing refresh token:", err.message);
  }

    // 🔔 Send Welcome Notification (Email)
  // We use handleAsync so if this fails, it won't crash the request, but ideally we catch inside manager
  // NotificationManager.notify(user, 'welcome', { name: user.name }, { sendEmail: true, sendSms: false })
  //   .catch(err => console.error("Failed to send welcome notification:", err));

  // 7️⃣ Send uniform response format (same as Login)

  console.log("🚀 Signup successful:", user.email);
  res.status(201).json({
    message: "Registration successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
});


exports.login = handleAsync(async (req, res) => {
  const { email, password } = req.body;

  console.log("🟡 Login attempt for email:", email);

  // 1️⃣ Validate input
  if (!email || !password) {
    console.log("🔴 Missing email or password in request");
    return res.status(400).json({ message: "Please provide both email and password" });
  }

  // 2️⃣ Check if user exists
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    console.log("🔴 No user found for email:", email);
    return res.status(401).json({ message: "User not found" });
  }

  // 3️⃣ Compare plain password with hashed one
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    console.log("🔴 Invalid password for email:", email);
    return res.status(401).json({ message: "Invalid password" });
  }

  console.log("🟢 User authenticated successfully:", user._id);

  // 4️⃣ Generate access token (short-lived) - pass user object, not just ID
  const accessToken = generateToken(user);
  console.log("🟢 Access token generated:", accessToken.slice(0, 25) + "...");

  // 5️⃣ Generate refresh token (long-lived)
  const jwt = require("jsonwebtoken");
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: "7d" } // valid for 7 days
  );
  console.log("🟢 Refresh token generated:", refreshToken.slice(0, 25) + "...");

  // 6️⃣ Save refresh token in DB
  const Token = require("../models/tokenModel.js");
  try {
    const savedToken = await Token.create({
      userId: user._id,
      token: refreshToken,
      purpose: "refreshToken",
    });
    console.log("✅ Refresh token saved to DB:", savedToken._id);
  } catch (err) {
    console.error("❌ Error saving refresh token to DB:", err.message);
  }

  // 7️⃣ Send back safe user info + both tokens
  console.log("🚀 Login successful for:", user.email);
  res.status(200).json({
    message: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
});


exports.getProfile = handleAsync(async (req, res) => {
  // req.user set by auth middleware - check both id and _id
  const userId = req.user._id || req.user.id;
  const user = await User.findById(userId).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

exports.updateProfile = handleAsync(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const updates = (({ name, bio, phone }) => ({ name, bio, phone }))(req.body);
  // allow image upload as req.file or req.files
  if (req.file || (req.files && req.files.avatar)) {
    // if you use Cloudinary uploader
    const file = req.file || req.files.avatar[0];
    // Assuming a cloudinary uploader helper exists - implement upload logic in services.
    const { secure_url, public_id } = await require('../config/cloudinary').upload(file.path || file.buffer);
    updates.avatar = { url: secure_url, public_id };
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
  res.json(user);
});

// optional: admin-only: list all users, delete user, make admin
exports.listUsers = handleAsync(async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

exports.deleteUser = handleAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
});

// ==================================================
// 🔴 LOGOUT
// ==================================================
exports.logout = handleAsync(async (req, res) => {
  // If using tokens, logout just means deleting the refresh token (if stored)
  if (req.user) {
    await Token.deleteMany({ user: req.user.id }); // remove saved tokens (optional)
  }
  res.json({ success: true, message: "Logged out successfully." });
});

// ==================================================
// 🔁 REFRESH TOKEN
// ==================================================
exports.refreshToken = async (req, res) => {
  try {
    // Support both body token and cookie token
    const token = req.body?.token || req.cookies?.refreshToken;
    console.log("🟡 Received refresh token from client");

    if (!token) {
      console.log("🔴 No token provided");
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify token first
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      console.log("🟢 Token decoded successfully");
    } catch (err) {
      console.log("🔴 Token verification failed:", err.message);
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    // Check if token exists in DB (optional but recommended)
    const savedToken = await Token.findOne({ token, purpose: 'refreshToken' });
    if (!savedToken) {
      console.log("🔴 Token not found in database");
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Get user to generate proper token
    const userId = decoded.id || decoded.sub;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new access token using generateToken utility
    const { generateToken } = require('../utils/generateToken');
    const newAccessToken = generateToken(user);

    console.log("✅ New access token generated!");
    res.json({ accessToken: newAccessToken });

  } catch (error) {
    console.error("❌ Error in refreshToken controller:", error);
    res.status(500).json({ message: "Token refresh failed", error: error.message });
  }
};

// ==================================================
// ✅ VERIFY EMAIL
// ==================================================
exports.verifyEmail = handleAsync(async (req, res) => {
  const { token } = req.query; // Expecting ?token=...

  if (!token) return res.status(400).json({ message: "Invalid token" });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const tokenDoc = await Token.findOne({
    token: hashedToken,
    purpose: "emailVerification",
  });

  if (!tokenDoc) {
    return res.status(400).json({ message: "Token is invalid or has expired" });
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isVerified = true;
  await user.save();

  await Token.deleteOne({ _id: tokenDoc._id });

  // Optionally send a "Verification Success" email
  // NotificationManager.notify(user, 'verification_success', ...);

  res.status(200).json({ message: "Email verified successfully. You can now login." });
});

// ==================================================
// 🧠 FORGOT PASSWORD
// ==================================================
exports.forgotPassword = handleAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  await Token.create({
    userId: user._id, // ✅ changed 'user' → 'userId' to match model field name
    token: hashedToken,
    purpose: "passwordReset", // ✅ changed 'type' → 'purpose' to match model field name
    expiresAt: Date.now() + 10 * 60 * 1000, // ✅ optional extra field if you want to track manually
  });

  const resetURL = `${req.protocol}://${req.get("host")}/api/auth/resetPassword/${resetToken}`;
  await sendEmail(user.email, "Password Reset", `Reset your password: ${resetURL}`);

  res.json({ message: "Password reset link sent to your email" });
});

// ==================================================
// 🔐 RESET PASSWORD
// ==================================================
exports.resetPassword = handleAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body; // user’s new password

  // 1️⃣ Hash the token (because in DB we stored it hashed)
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 2️⃣ Find matching token in DB
  const tokenDoc = await Token.findOne({
    token: hashedToken,
    purpose: "passwordReset",
  });

  if (!tokenDoc)
    return res.status(400).json({ message: "Invalid or expired token" });

  // 3️⃣ Find user
  const user = await User.findById(tokenDoc.userId);
  if (!user)
    return res.status(404).json({ message: "User not found" });

  // 4️⃣ Update user password
  user.password = password;
  await user.save();

  // 5️⃣ Delete the token after use (for security)
  await Token.deleteOne({ _id: tokenDoc._id });

  res.json({ message: "Password reset successful" });
});
  