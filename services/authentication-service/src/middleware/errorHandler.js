const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Validation errors
  if (err.name === 'ValidationError' || err.name === 'BadRequestError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation error',
      errors: err.errors,
    });
  }

  // Authentication errors
  if (err.name === 'UnauthorizedError' || err.message?.includes('token')) {
    return res.status(401).json({
      success: false,
      message: err.message || 'Authentication failed',
    });
  }

  // Not found errors
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message || 'Resource not found',
    });
  }

  // Server error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
