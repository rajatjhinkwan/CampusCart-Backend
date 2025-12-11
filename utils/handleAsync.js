// 📁 utils/handleAsync.js
// ✅ Purpose: Catch async errors automatically without using try-catch everywhere

const handleAsync = (fn) => (req, res, next) => {
  // Run the async function and convert its result to a Promise
  // If it fails, forward the error to Express error handler using next()
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = handleAsync;
