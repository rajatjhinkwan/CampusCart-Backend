// utils/generateToken.js
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  // defensive: environment should set JWT_SECRET; throw early so dev notices
  console.warn('Warning: JWT_SECRET is not set. Please set process.env.JWT_SECRET');
}

const generateToken = (user = {}, options = {}) => {
  // user: object containing at least id. We'll include minimal safe claims.
  // options: { expiresIn } override
  const payload = {
    sub: user._id || user.id,
    role: user.role,
    email: user.email,
  };

  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    return jwt.verify(token, secret);
  } catch (err) {
    // rethrow so callers handle (e.g. auth middleware)
    throw err;
  }
};

module.exports = { generateToken, verifyToken };
