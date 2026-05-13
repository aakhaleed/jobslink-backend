// src/models/workerProfile.model.js
// Every worker has a profile linked to their user account.
// Think of this as the worker's CV on JobsLink.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WorkerProfile = sequelize.define('WorkerProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  skills: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
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
  experience_years: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  portfolio_urls: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  avg_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00
  },
  total_jobs: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_earned: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  badges: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  id_doc_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  response_time_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  }
}, {
  tableName: 'worker_profiles',
  timestamps: true
});

module.exports = WorkerProfile;