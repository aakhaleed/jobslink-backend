// src/controllers/admin.controller.js
// This is the control room for JobsLink.
// Only admin users can access these routes.
// Admins can manage users, jobs, disputes and view analytics.

const {
  User,
  WorkerProfile,
  Job,
  Bid,
  Transaction,
  Wallet,
  Escrow,
  Rating
} = require('../models/index');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// ─── GET DASHBOARD STATS ─────────────────────────────────────
// GET /api/admin/stats
// Overview numbers for the admin dashboard
const getDashboardStats = async (req, res) => {
  try {
    // Count all users
    const totalUsers = await User.count();
    const totalClients = await User.count({ where: { role: 'client' } });
    const totalWorkers = await User.count({ where: { role: 'worker' } });
    const verifiedWorkers = await User.count({
      where: { role: 'worker', is_verified: true }
    });

    // Count all jobs
    const totalJobs = await Job.count();
    const openJobs = await Job.count({ where: { status: 'open' } });
    const activeJobs = await Job.count({ where: { status: 'in_progress' } });
    const completedJobs = await Job.count({ where: { status: 'completed' } });

    // Calculate total platform revenue (sum of platform fees)
    const revenueResult = await Transaction.findOne({
      where: { type: 'platform_fee' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
      ]
    });
    const totalRevenue = revenueResult?.dataValues?.total_revenue || 0;

    // Total money paid out to workers
    const payoutResult = await Transaction.findOne({
      where: { type: 'escrow_release' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_payout']
      ]
    });
    const totalPayout = payoutResult?.dataValues?.total_payout || 0;

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.count({
      where: { createdAt: { [Op.gte]: today } }
    });

    // New jobs today
    const newJobsToday = await Job.count({
      where: { createdAt: { [Op.gte]: today } }
    });

    return successResponse(res, 'Dashboard stats fetched.', {
      users: {
        total: totalUsers,
        clients: totalClients,
        workers: totalWorkers,
        verified_workers: verifiedWorkers,
        new_today: newUsersToday
      },
      jobs: {
        total: totalJobs,
        open: openJobs,
        active: activeJobs,
        completed: completedJobs,
        new_today: newJobsToday
      },
      revenue: {
        total_platform_revenue: totalRevenue,
        total_worker_payouts: totalPayout
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return errorResponse(res, 'Could not fetch stats.', 500);
  }
};

// ─── GET ALL USERS ───────────────────────────────────────────
// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const {
      role,
      is_verified,
      is_active,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};
    if (role) where.role = role;
    if (is_verified !== undefined) where.is_verified = is_verified === 'true';
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'otp', 'otp_expires'] },
      include: [
        {
          model: WorkerProfile,
          as: 'workerProfile',
          required: false,
          attributes: ['category', 'avg_rating', 'total_jobs', 'total_earned']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, 'Users fetched successfully.', {
      users,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, 'Could not fetch users.', 500);
  }
};

// ─── GET SINGLE USER ─────────────────────────────────────────
// GET /api/admin/users/:userId
const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password_hash', 'otp', 'otp_expires'] },
      include: [
        {
          model: WorkerProfile,
          as: 'workerProfile',
          required: false
        },
        {
          model: Wallet,
          as: 'wallet',
          required: false
        }
      ]
    });

    if (!user) return errorResponse(res, 'User not found.', 404);

    return successResponse(res, 'User fetched successfully.', { user });

  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(res, 'Could not fetch user.', 500);
  }
};

// ─── VERIFY WORKER ───────────────────────────────────────────
// PUT /api/admin/users/:userId/verify
// Admin manually verifies a worker after checking their ID
const verifyWorker = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) return errorResponse(res, 'User not found.', 404);

    if (user.role !== 'worker') {
      return errorResponse(res, 'Only workers can be verified.');
    }

    await user.update({ is_verified: true });

    // Add verified badge to worker profile
    const workerProfile = await WorkerProfile.findOne({
      where: { user_id: user.id }
    });

    if (workerProfile) {
      const badges = workerProfile.badges || [];
      if (!badges.includes('Verified Pro')) {
        badges.push('Verified Pro');
        await workerProfile.update({ badges });
      }
    }

    return successResponse(res, `${user.full_name} has been verified successfully.`);

  } catch (error) {
    console.error('Verify worker error:', error);
    return errorResponse(res, 'Could not verify worker.', 500);
  }
};

// ─── SUSPEND USER ────────────────────────────────────────────
// PUT /api/admin/users/:userId/suspend
const suspendUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) return errorResponse(res, 'User not found.', 404);

    if (user.role === 'admin') {
      return errorResponse(res, 'Cannot suspend an admin account.');
    }

    await user.update({ is_active: false });

    return successResponse(res, `${user.full_name} has been suspended.`);

  } catch (error) {
    console.error('Suspend user error:', error);
    return errorResponse(res, 'Could not suspend user.', 500);
  }
};

// ─── REACTIVATE USER ─────────────────────────────────────────
// PUT /api/admin/users/:userId/reactivate
const reactivateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) return errorResponse(res, 'User not found.', 404);

    await user.update({ is_active: true });

    return successResponse(res, `${user.full_name} has been reactivated.`);

  } catch (error) {
    console.error('Reactivate user error:', error);
    return errorResponse(res, 'Could not reactivate user.', 500);
  }
};

// ─── GET ALL JOBS ────────────────────────────────────────────
// GET /api/admin/jobs
const getAllJobs = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const offset = (page - 1) * limit;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'full_name', 'email', 'phone']
        },
        {
          model: User,
          as: 'worker',
          attributes: ['id', 'full_name', 'email', 'phone'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, 'Jobs fetched successfully.', {
      jobs,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Admin get jobs error:', error);
    return errorResponse(res, 'Could not fetch jobs.', 500);
  }
};

// ─── GET ALL TRANSACTIONS ────────────────────────────────────
// GET /api/admin/transactions
const getAllTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const where = {};
    if (type) where.type = type;

    const offset = (page - 1) * limit;

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return successResponse(res, 'Transactions fetched successfully.', {
      transactions,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Admin transactions error:', error);
    return errorResponse(res, 'Could not fetch transactions.', 500);
  }
};

// ─── DELETE JOB ──────────────────────────────────────────────
// DELETE /api/admin/jobs/:jobId
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.jobId);

    if (!job) return errorResponse(res, 'Job not found.', 404);

    await job.update({ status: 'cancelled' });

    return successResponse(res, 'Job cancelled by admin.');

  } catch (error) {
    console.error('Admin delete job error:', error);
    return errorResponse(res, 'Could not cancel job.', 500);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUser,
  verifyWorker,
  suspendUser,
  reactivateUser,
  getAllJobs,
  getAllTransactions,
  deleteJob
};