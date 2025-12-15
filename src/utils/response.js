// Success response
exports.sendSuccess = (res, statusCode = 200, message, data = null) => {
  const response = {
    success: true,
    message
  };
  
  if (data) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

// Error response
exports.sendError = (res, statusCode = 500, message, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

// Pagination helper
exports.paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit
  };
};

// Get pagination meta
exports.getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};
