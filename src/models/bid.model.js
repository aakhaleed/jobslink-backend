// src/models/bid.model.js
// When a worker sees a job they want, they send a bid.
// This table stores all bids from workers on jobs.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Bid = sequelize.define('Bid', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  worker_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  proposal: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  est_hours: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'bids',
  timestamps: true
});

module.exports = Bid;