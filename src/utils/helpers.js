// src/utils/helpers.js
// Small reusable functions used across the whole app.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Hash a password before saving to database
// We never store plain passwords — always hashed
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Check if a password matches the stored hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate a JWT token for a logged-in user
// This token is sent to the frontend and used for every request
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate a 6-digit OTP for phone/email verification
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format a success response — keeps all responses consistent
const successResponse = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Format an error response
const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateOTP,
  successResponse,
  errorResponse
};