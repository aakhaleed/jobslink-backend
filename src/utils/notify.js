// src/utils/notify.js
// This is a helper function to create notifications.
// Call this whenever something important happens.
// Example: when a bid is placed, notify the client.

const { Notification } = require('../models/index')

const notify = async (user_id, { title, message, type, link, data }) => {
  try {
    await Notification.create({
      user_id,
      title,
      message,
      type: type || 'general',
      link: link || null,
      data: data || null
    })
  } catch (error) {
    console.error('Notification error:', error.message)
  }
}

module.exports = notify