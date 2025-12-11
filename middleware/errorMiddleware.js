function errorHandler(err, req, res, next) {
  // express default status
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // friendly shape
  const response = {
    message: err.message || "Internal Server Error",
  };

  // include validation errors or additional info if present
  if (err.errors) {
    response.errors = err.errors; // mongoose validation object often lives here
  }

  // include stack only in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
