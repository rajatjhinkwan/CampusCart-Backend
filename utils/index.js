// utils/index.js
const { generateToken, verifyToken } = require('./generateToken');
const handleAsync = require('./handleAsync');
const generateSlug = require('./generateSlug');
const pagination = require('./pagination');
const { logger, morganMiddleware } = require('./logger');
const constants = require('./constants');

module.exports = {
  generateToken,
  verifyToken,
  handleAsync,
  generateSlug,
  pagination,
  logger,
  morganMiddleware,
  constants,
};
