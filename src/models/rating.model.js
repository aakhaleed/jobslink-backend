// src/models/rating.model.js
// After every completed job both sides rate each other.
// Workers are rated on quality, speed, communication, professionalism.
// Clients are rated on communication and payment speed.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reviewer_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reviewee_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  communication: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  quality: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  speed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  professionalism: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  overall: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false
  },
  review_text: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ratings',
  timestamps: true
});

module.exports = Rating;