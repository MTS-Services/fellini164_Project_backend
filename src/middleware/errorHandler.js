// Error handler middleware
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log error for dev
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }
  
  // Prisma errors
  if (err.code === 'P2002') {
    const message = 'Duplicate field value entered';
    error = { statusCode: 400, message };
  }
  
  if (err.code === 'P2025') {
    const message = 'Record not found';
    error = { statusCode: 404, message };
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { statusCode: 400, message };
  }
  
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Not found handler
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};
