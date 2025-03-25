// src/middleware/auth.js
const { UnauthorizedError } = require('../utils/errorHandlers');
const db = require('../db');

/**
 * Middleware to authenticate users via X-User-ID header
 */
function authenticateUser(req, res, next) {
  const userId = req.header('X-User-ID');
  
  if (!userId) {
    return next(new UnauthorizedError('Authentication required. Please provide X-User-ID header.'));
  }
  
  // For this demo, we just check that there is a value in the header
  // In a real application, this would validate against a database or token system
  req.user = {
    id: userId,
    // Add additional user information as needed
  };
  
  next();
}

// Additional middleware to check for admin privileges
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required for this operation' });
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAdmin
};