// sockets/socketAuth.js
const jwt = require("jsonwebtoken");

function verifyTokenFromSocket(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // expected to include user id etc.
  } catch (err) {
    return null;
  }
}

module.exports = { verifyTokenFromSocket };
