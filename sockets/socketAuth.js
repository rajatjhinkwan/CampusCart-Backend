// socket/socketAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.verifyTokenFromSocket = (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { id: decoded.id }; // minimal info – you could attach name/avatar if you like
  } catch (_) {
    return null;
  }
};
