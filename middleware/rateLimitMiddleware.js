const rateLimit = require("express-rate-limit");

// general API limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});

// auth limiter: stricter for login/forgot-password endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6, // e.g. 6 attempts per 15 minutes
  message: {
    message: "Too many authentication attempts, please wait and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
