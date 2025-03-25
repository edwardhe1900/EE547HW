// src/utils/errorHandlers.js
// Custom error classes and handlers

// Custom error classes
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error(err);
  
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  errorHandler
};