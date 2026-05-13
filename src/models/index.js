// src/models/index.js
const { sequelize } = require('../config/db');
const User = require('./user.model');
const WorkerProfile = require('./workerProfile.model');
const Job = require('./job.model');
const Bid = require('./bid.model');
const Message = require('./message.model');
const Wallet = require('./wallet.model');
const Transaction = require('./transaction.model');
const Escrow = require('./escrow.model');
const Rating = require('./rating.model');

// User relationships
User.hasOne(WorkerProfile, { foreignKey: 'user_id', as: 'workerProfile' });
WorkerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Wallet relationships
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Transaction relationships
User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Job relationships
User.hasMany(Job, { foreignKey: 'client_id', as: 'postedJobs' });
Job.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

User.hasMany(Job, { foreignKey: 'worker_id', as: 'assignedJobs' });
Job.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });

// Bid relationships
Job.hasMany(Bid, { foreignKey: 'job_id', as: 'bids' });
Bid.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

User.hasMany(Bid, { foreignKey: 'worker_id', as: 'myBids' });
Bid.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });

// Message relationships
Job.hasMany(Message, { foreignKey: 'job_id', as: 'messages' });
Message.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

User.hasMany(Message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// Escrow relationships
Job.hasOne(Escrow, { foreignKey: 'job_id', as: 'escrow' });
Escrow.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

// Rating relationships
Job.hasMany(Rating, { foreignKey: 'job_id', as: 'ratings' });
Rating.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

User.hasMany(Rating, { foreignKey: 'reviewer_id', as: 'givenRatings' });
Rating.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });

User.hasMany(Rating, { foreignKey: 'reviewee_id', as: 'receivedRatings' });
Rating.belongsTo(User, { foreignKey: 'reviewee_id', as: 'reviewee' });

// Sync all models
const syncDB = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('All tables created successfully');
  } catch (error) {
    console.error('Table sync failed:', error.message);
  }
};

module.exports = {
  sequelize,
  syncDB,
  User,
  WorkerProfile,
  Job,
  Bid,
  Message,
  Wallet,
  Transaction,
  Escrow,
  Rating
};