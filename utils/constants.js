// utils/constants.js

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
};

const ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin',
};

const DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
};

const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Basic phone regex — adapt if you need strict format
  PHONE: /^[0-9\-\+\s]{7,15}$/,
};

module.exports = { HTTP_STATUS, ROLES, DEFAULTS, REGEX };
