const jwt = require('jsonwebtoken');

const getAccessSecret = () => {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret');
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || getAccessSecret();

const generateToken = (user = {}, options = {}) => {
  const userId = user._id || user.id;
  const payload = {
    sub: userId ? String(userId) : undefined,
    role: user.role,
    email: user.email,
  };
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, getAccessSecret(), { expiresIn });
};

const generateRefreshToken = (user = {}, options = {}) => {
  const userId = user._id || user.id;
  const payload = { id: userId ? String(userId) : undefined, sub: userId ? String(userId) : undefined };
  const expiresIn = options.expiresIn || process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, getRefreshSecret(), { expiresIn });
};

const verifyToken = (token) => jwt.verify(token, getAccessSecret());

const verifyRefreshToken = (token) => jwt.verify(token, getRefreshSecret());

const getFrontendUrl = () => {
  const fromEnv = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const corsOrigin = (process.env.CORS_ORIGINS || '').split(',')[0]?.trim();
  return (corsOrigin || 'http://localhost:5173').replace(/\/$/, '');
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  getAccessSecret,
  getRefreshSecret,
  getFrontendUrl,
};
