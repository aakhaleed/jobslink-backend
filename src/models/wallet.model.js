// src/models/wallet.model.js
// Every user on JobsLink has a wallet.
// This tracks their available balance, pending balance,
// and all money movements on the platform.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  available_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  pending_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  total_earned: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  total_spent: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  bank_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  account_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  account_name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'wallets',
  timestamps: true
});

module.exports = Wallet;