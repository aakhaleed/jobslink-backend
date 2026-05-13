// src/models/transaction.model.js
// Every money movement is recorded here.
// Think of this as a bank statement for each user.
// We never delete transactions — they are permanent records.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM(
      'deposit',       // user funds wallet
      'withdrawal',    // user withdraws to bank
      'escrow_lock',   // money locked for a job
      'escrow_release',// money released to worker
      'refund',        // money returned to client
      'platform_fee'   // jobslink commission
    ),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    defaultValue: 'success'
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  gateway: {
    type: DataTypes.ENUM('paystack', 'flutterwave', 'wallet', 'system'),
    defaultValue: 'system'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  timestamps: true
});

module.exports = Transaction;