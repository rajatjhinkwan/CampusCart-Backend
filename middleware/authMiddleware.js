const jwt = require("jsonwebtoken");
const { getAccessSecret, getRefreshSecret } = require('../utils/generateToken');
const User = require("../models/userModel");

// ================================
// 🔐 PROTECT ROUTES (Access Token)
// ================================
async function protect(req, res, next) {
  try {
    let token;

    // 1️⃣ Check Authorization Header: "Authorization: Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1]; // extract token
    }

    // 2️⃣ Check Cookie (accessToken)
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }


    // 3️⃣ If token missing, reject
    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    // 4️⃣ Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, getAccessSecret());
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      } else if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      } else {
        return res.status(401).json({ message: "Token verification failed" });
      }
    }

    // 5️⃣ Extract user ID from token payload (supports sub or id)
    const userId = decoded.sub || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // 6️⃣ Fetch user from database
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // 7️⃣ Attach user to request (ensure both _id and id are available)
    req.user = user;
    req.user.id = user._id.toString(); // Ensure id is available for compatibility

    // ✅ Continue to next middleware/controller
    next();
  } catch (err) {
    console.log("AUTH ERROR:", err);
    return res.status(401).json({ message: "Not authorized" });
  }
}

// ===================================
// 🔁 REFRESH TOKEN MIDDLEWARE
// ===================================
async function refreshProtect(req, res, next) {
  try {
    let token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token found" });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, getRefreshSecret());
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Refresh token expired" });
      } else if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid refresh token" });
      } else {
        return res.status(401).json({ message: "Refresh token verification failed" });
      }
    }

    // Extract user ID and fetch user
    const userId = decoded.sub || decoded.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.user.id = user._id.toString(); // Ensure id is available for compatibility
    next();
  } catch (err) {
    console.log("REFRESH ERROR:", err);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

module.exports = {
  protect,
  refreshProtect,
};
