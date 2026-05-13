// src/models/job.model.js
// This is the most important table in JobsLink.
// Every job posted by a client lives here.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  worker_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'mechanic', 'barber', 'carpenter', 'plumber',
      'electrician', 'ac_repair', 'painter', 'cleaner',
      'delivery', 'generator_repair', 'tailor',
      'phone_repair', 'welder', 'photographer',
      'graphic_designer', 'web_developer', 'other'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(
      'open', 'assigned', 'in_progress',
      'completed', 'cancelled', 'disputed'
    ),
    defaultValue: 'open'
  },
  urgency: {
    type: DataTypes.ENUM('emergency', 'same_day', 'scheduled'),
    allowNull: false
  },
  hire_type: {
    type: DataTypes.ENUM('quick_match', 'bidding'),
    defaultValue: 'bidding'
  },
  budget_min: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  budget_max: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  final_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'jobs',
  timestamps: true
});

module.exports = Job;