// utils/logger.js
const winston = require('winston');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// Create a Winston logger with console + file transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log') }),
  ],
});

// In non-production, add console (readable)
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

// morgan middleware using winston stream
const morganStream = {
  write: (message) => {
    // morgan outputs a trailing newline; trim it
    logger.info(message.trim());
  },
};

// Export morgan middleware factory and logger
const morganMiddleware = morgan('combined', { stream: morganStream });

module.exports = { logger, morganMiddleware };
