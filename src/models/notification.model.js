// src/models/notification.model.js
// Every notification sent to a user is stored here.
// Users can see all their notifications in one place.

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'job_posted',
      'bid_received',
      'bid_accepted',
      'bid_rejected',
      'job_assigned',
      'job_completed',
      'payment_received',
      'payment_released',
      'escrow_funded',
      'dispute_opened',
      'dispute_resolved',
      'new_message',
      'account_verified',
      'general'
    ),
    defaultValue: 'general'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true
})

module.exports = Notification