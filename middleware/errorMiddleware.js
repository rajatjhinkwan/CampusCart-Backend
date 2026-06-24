function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : (err.status || 500);
  const stack = typeof err.stack === "string" ? err.stack : "";
  let file, line, column;
  const winMatch = stack.match(/(?:\(|\s)([A-Za-z]:[\\/].*?):(\d+):(\d+)/);
  const nixMatch = stack.match(/(?:\(|\s)(\/.*?):(\d+):(\d+)/);
  const m = winMatch || nixMatch;
  if (m) {
    file = m[1];
    line = Number(m[2]);
    column = Number(m[3]);
  }
  const requestId = req.id || req.headers["x-request-id"];
  const response = {
    message: err.message || "Internal Server Error",
    path: req.originalUrl,
    method: req.method,
    status: statusCode,
    requestId,
  };
  if (file) {
    response.file = file;
    response.line = line;
    response.column = column;
  }
  if (err.code) {
    response.code = err.code;
  }
  if (err.errors) {
    response.errors = err.errors;
  }
  response.copyText = [
    `Error: ${response.message}`,
    requestId ? `RequestId: ${requestId}` : "",
    `Path: ${response.path}`,
    file ? `File: ${file}` : "",
    file ? `Line: ${line}` : "",
    file ? `Column: ${column}` : "",
    `Status: ${statusCode}`,
  ].filter(Boolean).join("\n");
  if (process.env.NODE_ENV === "development") {
    response.stack = stack;
  }
  res.status(statusCode).json(response);
}

module.exports = errorHandler;
