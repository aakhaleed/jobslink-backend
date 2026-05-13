// src/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getConversations
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

// All chat routes require login
router.get('/conversations', protect, getConversations);
router.post('/:jobId', protect, sendMessage);
router.get('/:jobId', protect, getMessages);

module.exports = router;