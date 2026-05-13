// src/models/escrow.model.js
// Escrow is a safe holding area for money.
// When a client funds a job, money goes here first.
// It only moves to the worker after job is confirmed complete.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Escrow = sequelize.define('Escrow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  client_id: {
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
  platform_fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  worker_payout: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM(
      'pending',   // not yet funded
      'funded',    // money locked in escrow
      'released',  // money sent to worker
      'refunded',  // money returned to client
      'disputed'   // under admin review
    ),
    defaultValue: 'pending'
  }
}, {
  tableName: 'escrows',
  timestamps: true
});

module.exports = Escrow;