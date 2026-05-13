// src/routes/auth.routes.js
// These are the URL paths for authentication.
// Think of routes like doors into your API.

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyOTP,
  getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Public routes — no login needed
router.post('/register', register);
router.post('/login', login);

// Protected routes — must be logged in
router.post('/verify-otp', protect, verifyOTP);
router.get('/me', protect, getMe);

module.exports = router;