// src/controllers/notifications.controller.js
const { Notification } = require('../models/index')
const { successResponse, errorResponse } = require('../utils/helpers')

// GET /api/notifications
// Get all notifications for logged in user
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    })

    const unreadCount = notifications.filter(n => !n.is_read).length

    return successResponse(res, 'Notifications fetched.', {
      notifications,
      unread_count: unreadCount
    })
  } catch (error) {
    return errorResponse(res, 'Could not fetch notifications.', 500)
  }
}

// PUT /api/notifications/read-all
// Mark all notifications as read
const markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    )
    return successResponse(res, 'All notifications marked as read.')
  } catch (error) {
    return errorResponse(res, 'Could not update notifications.', 500)
  }
}

// PUT /api/notifications/:id/read
// Mark single notification as read
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id)
    if (!notification) return errorResponse(res, 'Notification not found.', 404)
    if (notification.user_id !== req.user.id) {
      return errorResponse(res, 'Not authorized.', 403)
    }
    await notification.update({ is_read: true })
    return successResponse(res, 'Notification marked as read.')
  } catch (error) {
    return errorResponse(res, 'Could not update notification.', 500)
  }
}

// DELETE /api/notifications/clear
// Clear all notifications
const clearAll = async (req, res) => {
  try {
    await Notification.destroy({
      where: { user_id: req.user.id }
    })
    return successResponse(res, 'All notifications cleared.')
  } catch (error) {
    return errorResponse(res, 'Could not clear notifications.', 500)
  }
}

module.exports = { getNotifications, markAllRead, markRead, clearAll }