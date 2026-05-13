// src/middleware/auth.middleware.js
// This is a security guard for your API routes.
// Any route that needs login will use this middleware.
// If no valid token is provided, access is denied.

const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/helpers');
const { User } = require('../models/index');

// Protect any route — user must be logged in
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in the Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Not authorized. Please log in.', 401);
    }

    // Verify the token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user this token belongs to
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return errorResponse(res, 'User no longer exists.', 401);
    }

    if (!user.is_active) {
      return errorResponse(res, 'Your account has been suspended.', 401);
    }

    // Attach user to the request so routes can access it
    req.user = user;
    next();

  } catch (error) {
    return errorResponse(res, 'Invalid token. Please log in again.', 401);
  }
};

// Restrict certain routes to specific roles
// Example: only admins can access admin routes
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        'You do not have permission to perform this action.',
        403
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };