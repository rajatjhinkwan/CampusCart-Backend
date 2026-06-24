// utils/pagination.js

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePagination = (query = {}) => {
  // Accepts query params: page, limit, sortBy, sortOrder, q (search)
  let page = parseInt(query.page, 10) || 1;
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;

  if (page < 1) page = 1;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  // Sorting: accept sortBy and sortOrder or single sort param (e.g. '-createdAt')
  let sort = {};
  if (query.sort) {
    // support "-createdAt" syntax
    const field = query.sort;
    if (field.startsWith('-')) sort[field.slice(1)] = -1;
    else sort[field] = 1;
  } else if (query.sortBy) {
    const order = (query.sortOrder || 'desc').toLowerCase();
    sort[query.sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sort = { createdAt: -1 };
  }

  return { page, limit, skip, sort };
};

const paginatedResponse = ({ docs, page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data: docs,
  };
};

module.exports = {
  parsePagination,
  paginatedResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
