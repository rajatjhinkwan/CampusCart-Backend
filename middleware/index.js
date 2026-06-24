const protect = require('./authMiddleware');
const isAdmin = require('./adminMiddleware');
const upload = require('./uploadMiddleware');
const errorHandler = require('./errorMiddleware');
const { apiLimiter, authLimiter } = require('./rateLimitMiddleware');


module.exports = { protect, isAdmin, upload, errorHandler, apiLimiter, authLimiter };