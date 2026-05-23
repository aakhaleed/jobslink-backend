// src/routes/notifications.routes.js
const express = require('express')
const router = express.Router()
const {
  getNotifications,
  markAllRead,
  markRead,
  clearAll
} = require('../controllers/notifications.controller')
const { protect } = require('../middleware/auth.middleware')

router.get('/', protect, getNotifications)
router.put('/read-all', protect, markAllRead)
router.put('/:id/read', protect, markRead)
router.delete('/clear', protect, clearAll)

module.exports = router